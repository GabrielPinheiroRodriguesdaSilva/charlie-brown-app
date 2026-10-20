import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

// Se o IP do computador mudar, atualize aqui.
const API_URL = 'http://192.168.0.9:8080';

function formatarTempo(valor) {
  const segundos = Number.isFinite(valor)
    ? Math.max(0, Math.floor(valor))
    : 0;

  const minutos = Math.floor(segundos / 60);
  const restante = segundos % 60;

  return `${minutos}:${String(restante).padStart(2, '0')}`;
}

export default function App() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const playerRef = useRef(player);

  const [musicas, setMusicas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroCapa, setErroCapa] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [posicao, setPosicao] = useState(0);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Busca as músicas no Spring Boot.
  useEffect(() => {
    let ativo = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    async function carregarMusicas() {
      setCarregando(true);
      setErro('');

      try {
        const resposta = await fetch(`${API_URL}/musicas`, {
          signal: controller.signal,
        });

        if (!resposta.ok) {
          throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();

        if (!Array.isArray(dados)) {
          throw new Error('A API não retornou uma lista de músicas.');
        }

        if (!ativo) return;

        setMusicas(dados);

        const primeira = dados.find((musica) => musica.arquivoAudio);

        playerRef.current.pause();
        setErroCapa(false);
        setArrastando(false);
        setPosicao(0);

        if (primeira) {
          playerRef.current.replace({
            uri: `${API_URL}/musicas/${primeira.id}/audio`,
          });

          setSelecionada(primeira);
        } else {
          setSelecionada(null);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            'Não foi possível carregar as músicas. Confira se o Spring está ligado, se o IP está correto e se o celular está na mesma rede Wi-Fi.'
          );
        }
      } finally {
        clearTimeout(timeout);

        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarMusicas();

    return () => {
      ativo = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [tentativa]);

  // Agrupa as músicas por álbum.
  const grupos = new Map();

  for (const musica of musicas) {
    const album = musica.album?.trim() || 'Sem álbum';

    if (!grupos.has(album)) {
      grupos.set(album, []);
    }

    grupos.get(album).push(musica);
  }

  const musicasPorAlbum = Array.from(grupos.entries())
    .sort(([albumA], [albumB]) => albumA.localeCompare(albumB, 'pt-BR'))
    .map(([album, faixas]) => ({
      title: album,
      data: [...faixas].sort((a, b) =>
        a.titulo.localeCompare(b.titulo, 'pt-BR')
      ),
    }));

  // Usa a mesma ordem do menu para avançar e voltar.
  const disponiveis = musicasPorAlbum
    .flatMap((grupo) => grupo.data)
    .filter((musica) => musica.arquivoAudio);

  function escolherMusica(musica) {
    if (!musica.arquivoAudio) {
      Alert.alert(
        'Áudio indisponível',
        'O áudio desta música ainda não foi enviado.'
      );
      return;
    }

    setMenuAberto(false);

    if (selecionada?.id === musica.id) return;

    try {
      player.pause();

      player.replace({
        uri: `${API_URL}/musicas/${musica.id}/audio`,
      });

      setSelecionada(musica);
      setErroCapa(false);
      setArrastando(false);
      setPosicao(0);

      player.play();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o áudio desta música.');
    }
  }

  function mudarMusica(direcao) {
    if (disponiveis.length < 2) return;

    const indiceAtual = disponiveis.findIndex(
      (musica) => musica.id === selecionada?.id
    );

    const proximoIndice =
      (indiceAtual + direcao + disponiveis.length) % disponiveis.length;

    escolherMusica(disponiveis[proximoIndice]);
  }

  async function alternarReproducao() {
    if (!selecionada || !status.isLoaded) return;

    try {
      if (status.playing) {
        player.pause();
        return;
      }

      if (status.didJustFinish) {
        await player.seekTo(0);
      }

      player.play();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível controlar a reprodução.');
    }
  }

  async function buscarPosicao(valor) {
    try {
      await player.seekTo(valor);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível mudar o tempo da música.');
    } finally {
      setArrastando(false);
    }
  }

  const duracao = status.duration || 0;
  const tempoAtual = arrastando ? posicao : status.currentTime || 0;
  const podeReproduzir = Boolean(selecionada && status.isLoaded);

  return (
    <View style={styles.tela}>
      <StatusBar barStyle="light-content" />

      {/* Fundo separado dos controles para não bloquear os toques. */}
      <View style={styles.fundo} pointerEvents="none">
        <Image
          source={require('./assets/fundo-skate-v3.gif')}
          style={styles.imagemFundo}
          resizeMode="cover"
        />
      </View>

      {/* Mantém os controles fora da área da bateria e do relógio. */}
      <SafeAreaView style={styles.areaSegura}>
        <View style={styles.cabecalho}>
          <View style={styles.textosCabecalho}>
            <Text style={styles.nomeApp}>Charlie Brown Jr.</Text>
            <Text style={styles.subtitulo}>As melhores</Text>
          </View>

          <Pressable
            style={styles.botaoMenu}
            onPress={() => setMenuAberto(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir músicas por álbum"
          >
            <View style={styles.linhaMenu} />
            <View style={styles.linhaMenu} />
            <View style={styles.linhaMenu} />
          </Pressable>
        </View>

        <View style={styles.areaPlayer}>
          <View style={styles.player}>
            {selecionada?.arquivoCapa && !erroCapa ? (
              <Image
                key={`${selecionada.id}-${selecionada.arquivoCapa}`}
                source={{
                  uri: `${API_URL}/musicas/${selecionada.id}/capa`,
                }}
                style={styles.capa}
                resizeMode="cover"
                onError={() => setErroCapa(true)}
              />
            ) : (
              <View style={[styles.capa, styles.capaVazia]}>
                {carregando ? (
                  <ActivityIndicator size="large" color="#9eeaff" />
                ) : (
                  <Text style={styles.textoCapa}>CBJR</Text>
                )}
              </View>
            )}

            <Text style={styles.tituloMusica} numberOfLines={2}>
              {selecionada?.titulo ||
                (carregando ? 'Carregando músicas...' : 'Escolha uma música')}
            </Text>

            <Text style={styles.albumMusica} numberOfLines={2}>
              {selecionada
                ? `${selecionada.album} · ${selecionada.ano}`
                : 'Abra o menu para ver os álbuns'}
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duracao > 0 ? duracao : 1}
              value={Math.min(tempoAtual, duracao > 0 ? duracao : 1)}
              disabled={!podeReproduzir || duracao <= 0}
              minimumTrackTintColor="#9eeaff"
              maximumTrackTintColor="#344357"
              thumbTintColor="#ffffff"
              onSlidingStart={(valor) => {
                setPosicao(valor);
                setArrastando(true);
              }}
              onValueChange={setPosicao}
              onSlidingComplete={buscarPosicao}
            />

            <View style={styles.tempos}>
              <Text style={styles.textoTempo}>
                {formatarTempo(tempoAtual)}
              </Text>

              <Text style={styles.textoTempo}>
                {formatarTempo(duracao)}
              </Text>
            </View>

            <View style={styles.controles}>
              <Pressable
                style={[
                  styles.botaoControle,
                  disponiveis.length < 2 && styles.desabilitado,
                ]}
                onPress={() => mudarMusica(-1)}
                disabled={disponiveis.length < 2}
                accessibilityRole="button"
                accessibilityLabel="Música anterior"
              >
                <Text style={styles.iconeControle}>⏮</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.botaoPlay,
                  !podeReproduzir && styles.desabilitado,
                ]}
                onPress={alternarReproducao}
                disabled={!podeReproduzir}
                accessibilityRole="button"
                accessibilityLabel={status.playing ? 'Pausar' : 'Reproduzir'}
              >
                {selecionada && !status.isLoaded ? (
                  <ActivityIndicator color="#071423" />
                ) : (
                  <Text style={styles.iconePlay}>
                    {status.playing ? 'Ⅱ' : '▶'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.botaoControle,
                  disponiveis.length < 2 && styles.desabilitado,
                ]}
                onPress={() => mudarMusica(1)}
                disabled={disponiveis.length < 2}
                accessibilityRole="button"
                accessibilityLabel="Próxima música"
              >
                <Text style={styles.iconeControle}>⏭</Text>
              </Pressable>
            </View>

            {erro ? (
              <View style={styles.areaErro}>
                <Text style={styles.textoErro}>{erro}</Text>

                <Pressable
                  style={styles.botaoTentar}
                  onPress={() => setTentativa((valor) => valor + 1)}
                >
                  <Text style={styles.textoTentar}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Menu com as músicas organizadas por álbum. */}
      <Modal
        visible={menuAberto}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuAberto(false)}
      >
        <View style={styles.modal}>
          <Pressable
            style={styles.areaFechar}
            onPress={() => setMenuAberto(false)}
            accessibilityLabel="Fechar lista de músicas"
            accessibilityRole="button"
          />

          <SafeAreaView
            style={styles.listaContainer}
            edges={['bottom', 'left', 'right']}
          >
            <View style={styles.topoLista}>
              <Text style={styles.tituloLista}>Músicas por álbum</Text>

              <Pressable
                onPress={() => setMenuAberto(false)}
                hitSlop={12}
                accessibilityLabel="Fechar"
                accessibilityRole="button"
              >
                <Text style={styles.fecharLista}>✕</Text>
              </Pressable>
            </View>

            <SectionList
              style={styles.lista}
              sections={musicasPorAlbum}
              keyExtractor={(item) => String(item.id)}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.conteudoLista}
              ListEmptyComponent={
                <Text style={styles.listaVazia}>
                  {carregando
                    ? 'Carregando músicas...'
                    : 'Nenhuma música encontrada.'}
                </Text>
              }
              renderSectionHeader={({ section }) => (
                <View style={styles.cabecalhoAlbum}>
                  <Text style={styles.nomeAlbum}>{section.title}</Text>

                  <Text style={styles.quantidadeMusicas}>
                    {section.data.length}{' '}
                    {section.data.length === 1 ? 'música' : 'músicas'}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const estaSelecionada = selecionada?.id === item.id;

                return (
                  <Pressable
                    onPress={() => escolherMusica(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Tocar ${item.titulo}`}
                    style={[
                      styles.itemMusica,
                      estaSelecionada && styles.itemSelecionado,
                    ]}
                  >
                    <View style={styles.dadosMusica}>
                      <Text style={styles.nomeMusicaLista}>
                        {item.titulo}
                      </Text>

                      {!item.arquivoAudio && (
                        <Text style={styles.avisoAudio}>
                          Áudio ainda não enviado
                        </Text>
                      )}
                    </View>

                    <Text style={styles.indicadorMusica}>
                      {estaSelecionada ? '♪' : '▶'}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#02050f',
  },

  fundo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },

  imagemFundo: {
    width: '100%',
    height: '100%',
  },

  areaSegura: {
    flex: 1,
    zIndex: 1,
  },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  textosCabecalho: {
    flex: 1,
    marginRight: 12,
  },

  nomeApp: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: '#9eeaff',
    fontSize: 16,
    marginTop: 5,
  },

  botaoMenu: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0b1929',
    borderWidth: 1,
    borderColor: '#9eeaff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  linhaMenu: {
    width: 23,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginVertical: 2,
  },

  areaPlayer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  player: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#8acfe7',
    borderRadius: 24,
    backgroundColor: 'transparent',
    padding: 18,
    alignItems: 'center',
  },

  capa: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
  },

  capaVazia: {
    backgroundColor: '#1a2c43',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCapa: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },

  tituloMusica: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  albumMusica: {
    color: '#d4dfed',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  slider: {
    width: '100%',
    height: 40,
    marginTop: 14,
  },

  tempos: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  textoTempo: {
    color: '#d4dfed',
    fontSize: 12,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  botaoControle: {
    padding: 12,
    marginHorizontal: 12,
  },

  iconeControle: {
    color: '#ffffff',
    fontSize: 28,
  },

  botaoPlay: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9eeaff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconePlay: {
    color: '#071423',
    fontSize: 27,
    fontWeight: 'bold',
  },

  desabilitado: {
    opacity: 0.45,
  },

  areaErro: {
    marginTop: 16,
    alignItems: 'center',
  },

  textoErro: {
    color: '#ffbdbd',
    fontSize: 13,
    textAlign: 'center',
  },

  botaoTentar: {
    marginTop: 10,
    backgroundColor: '#203c50',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  textoTentar: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  modal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },

  areaFechar: {
    flex: 1,
  },

  listaContainer: {
    height: '70%',
    backgroundColor: '#091321',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  topoLista: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  tituloLista: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: 'bold',
  },

  fecharLista: {
    color: '#ffffff',
    fontSize: 24,
  },

  lista: {
    flex: 1,
  },

  conteudoLista: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  listaVazia: {
    color: '#bdc8da',
    textAlign: 'center',
    marginTop: 20,
  },

  cabecalhoAlbum: {
    paddingTop: 18,
    paddingBottom: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#345365',
  },

  nomeAlbum: {
    color: '#9eeaff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  quantidadeMusicas: {
    color: '#bdc8da',
    fontSize: 12,
    marginTop: 4,
  },

  itemMusica: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#142135',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  itemSelecionado: {
    borderColor: '#9eeaff',
    backgroundColor: '#1b354a',
  },

  dadosMusica: {
    flex: 1,
  },

  nomeMusicaLista: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  avisoAudio: {
    color: '#9eeaff',
    fontSize: 12,
    marginTop: 6,
  },

  indicadorMusica: {
    color: '#9eeaff',
    fontSize: 22,
    marginLeft: 12,
  },
});
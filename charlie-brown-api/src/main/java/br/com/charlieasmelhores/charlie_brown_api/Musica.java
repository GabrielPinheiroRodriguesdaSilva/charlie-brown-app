package br.com.charlieasmelhores.charlie_brown_api;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Musica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titulo;
    private String album;
    private int ano;
    private String arquivoAudio;
    private String arquivoCapa;

    protected Musica() {
    }

    public Musica(String titulo, String album, int ano) {
        this.titulo = titulo;
        this.album = album;
        this.ano = ano;
    }

    public Long getId() {
        return id;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getAlbum() {
        return album;
    }

    public int getAno() {
        return ano;
    }

    public void atualizar(String titulo, String album, int ano) {
    this.titulo = titulo;
    this.album = album;
    this.ano = ano;
}

public String getArquivoAudio() {
    return arquivoAudio;
}

public void definirArquivoAudio(String arquivoAudio) {
    this.arquivoAudio = arquivoAudio;
}

public String getArquivoCapa() {
    return arquivoCapa;
}

public void definirArquivoCapa(String arquivoCapa) {
    this.arquivoCapa = arquivoCapa;
}

}
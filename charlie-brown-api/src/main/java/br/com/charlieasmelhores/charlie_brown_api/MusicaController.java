package br.com.charlieasmelhores.charlie_brown_api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
public class MusicaController {

    private final MusicaRepository repository;

    public MusicaController(MusicaRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/musicas")
    public List<Musica> listarMusicas() {
        return repository.findAll();
    }
    @GetMapping("/musicas/{id}")
public Musica buscarMusica(@PathVariable Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Música não encontrada"
        ));
    }
    @GetMapping("/musicas/busca")
public List<Musica> buscarPorTitulo(@RequestParam String titulo) {
    return repository.findByTituloContainingIgnoreCase(titulo);
    }
    public record NovaMusica(String titulo, String album, int ano) {
    }

@PostMapping("/musicas")
public Musica cadastrarMusica(@RequestBody NovaMusica dados) {
    Musica musica = new Musica(
        dados.titulo(),
        dados.album(),
        dados.ano()
    );

    return repository.save(musica);
    }
    @DeleteMapping("/musicas/{id}")
public void excluirMusica(@PathVariable Long id) {
    Musica musica = repository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Música não encontrada"
        ));

    repository.delete(musica);
    }

    public record DadosAtualizacao(String titulo, String album, int ano) {
}

@PutMapping("/musicas/{id}")
public Musica atualizarMusica(
        @PathVariable Long id,
        @RequestBody DadosAtualizacao dados) {

    Musica musica = repository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Música não encontrada"
        ));

    musica.atualizar(dados.titulo(), dados.album(), dados.ano());
    return repository.save(musica);
    }
}
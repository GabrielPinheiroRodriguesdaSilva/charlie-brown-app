package br.com.charlieasmelhores.charlie_brown_api;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class CapaController {

    private final MusicaRepository repository;

    private final Path pastaCapas =
        Path.of("uploads", "capas").toAbsolutePath().normalize();

    public CapaController(MusicaRepository repository)
            throws IOException {
        this.repository = repository;
        Files.createDirectories(pastaCapas);
    }

    @PostMapping("/musicas/{id}/capa")
    public String enviarCapa(
            @PathVariable Long id,
            @RequestParam("arquivo") MultipartFile arquivo
    ) throws IOException {

        Musica musica = buscarMusica(id);

        String tipo = arquivo.getContentType();
        String extensao;

        if (arquivo.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Envie uma imagem"
            );
        }

        if ("image/jpeg".equals(tipo)) {
            extensao = ".jpg";
        } else if ("image/png".equals(tipo)) {
            extensao = ".png";
        } else {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Envie uma imagem JPG ou PNG"
            );
        }

        String nomeArquivo = UUID.randomUUID() + extensao;
        Path destino = pastaCapas.resolve(nomeArquivo);

        arquivo.transferTo(destino);

        musica.definirArquivoCapa(nomeArquivo);
        repository.save(musica);

        return "Capa enviada para a música de id " + id;
    }

    @GetMapping("/musicas/{id}/capa")
    public ResponseEntity<Resource> exibirCapa(
            @PathVariable Long id
    ) {

        Musica musica = buscarMusica(id);
        String nomeArquivo = musica.getArquivoCapa();

        if (nomeArquivo == null || nomeArquivo.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Esta música ainda não tem capa"
            );
        }

        Path caminho = pastaCapas.resolve(nomeArquivo).normalize();

        if (!caminho.startsWith(pastaCapas)
                || !Files.isRegularFile(caminho)
                || !Files.isReadable(caminho)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Arquivo da capa não encontrado"
            );
        }

        MediaType tipo = nomeArquivo.endsWith(".png")
            ? MediaType.IMAGE_PNG
            : MediaType.IMAGE_JPEG;

        Resource capa = new FileSystemResource(caminho);

        return ResponseEntity.ok()
            .contentType(tipo)
            .body(capa);
    }

    private Musica buscarMusica(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Música não encontrada"
            ));
    }
}
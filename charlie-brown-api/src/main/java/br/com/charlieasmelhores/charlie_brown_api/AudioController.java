package br.com.charlieasmelhores.charlie_brown_api;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
public class AudioController {

    private final MusicaRepository repository;
    private final Path pastaAudios = Path.of("uploads").toAbsolutePath();

    public AudioController(MusicaRepository repository) throws IOException {
        this.repository = repository;
        Files.createDirectories(pastaAudios);
    }

    @PostMapping("/musicas/{id}/audio")
    public String enviarAudio(
            @PathVariable Long id,
            @RequestParam("arquivo") MultipartFile arquivo
    ) throws IOException
    
    {

        Musica musica = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Música não encontrada"
            ));

        if (arquivo.isEmpty()
                || !"audio/mpeg".equals(arquivo.getContentType())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Envie um arquivo MP3"
            );
        }

        String nomeArquivo = UUID.randomUUID() + ".mp3";
        Path destino = pastaAudios.resolve(nomeArquivo);

        arquivo.transferTo(destino);

        musica.definirArquivoAudio(nomeArquivo);
        repository.save(musica);

        return "Áudio enviado para a música de id " + id;
        }

        @GetMapping("/musicas/{id}/audio")
public ResponseEntity<Resource> ouvirAudio(@PathVariable Long id) {

    Musica musica = repository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Música não encontrada"
        ));

    if (musica.getArquivoAudio() == null) {
        throw new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Esta música ainda não tem áudio"
        );
    }

    Path caminho = pastaAudios.resolve(
        musica.getArquivoAudio()
    ).normalize();

    if (!caminho.startsWith(pastaAudios)
            || !Files.isRegularFile(caminho)
            || !Files.isReadable(caminho)) {
        throw new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Arquivo de áudio não encontrado"
        );
    }

    Resource audio = new FileSystemResource(caminho);

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("audio/mpeg"))
        .body(audio);
}
}
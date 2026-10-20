package br.com.charlieasmelhores.charlie_brown_api;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MusicaRepository extends JpaRepository<Musica, Long> {

    List<Musica> findByTituloContainingIgnoreCase(String titulo);
}
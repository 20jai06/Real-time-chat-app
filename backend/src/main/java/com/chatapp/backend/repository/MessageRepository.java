package com.chatapp.backend.repository;

import com.chatapp.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChatIdOrderByTimestampAsc(Long chatId);
}

package com.chatapp.backend.controller;

import com.chatapp.backend.entity.Chat;
import com.chatapp.backend.entity.Message;
import com.chatapp.backend.entity.User;
import com.chatapp.backend.repository.ChatRepository;
import com.chatapp.backend.repository.MessageRepository;
import com.chatapp.backend.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final UserRepository userRepository;

    @MessageMapping("/chat.send")
    public void processMessage(@Payload ChatMessagePayload chatMessagePayload, Authentication authentication) {
        String senderUsername = authentication.getName();
        User sender = userRepository.findByUsername(senderUsername).orElseThrow();
        Chat chat = chatRepository.findById(chatMessagePayload.getChatId()).orElseThrow();
        
        Message message = new Message();
        message.setContent(chatMessagePayload.getContent());
        message.setSender(sender);
        message.setChat(chat);
        message.setTimestamp(LocalDateTime.now());
        if (chatMessagePayload.getType() != null) {
            message.setType(chatMessagePayload.getType());
            message.setImageUrl(chatMessagePayload.getImageUrl());
        }
        
        Message savedMessage = messageRepository.save(message);
        MessageEvent event = new MessageEvent("NEW", savedMessage);

        for (User u : chat.getUsers()) {
            messagingTemplate.convertAndSendToUser(u.getUsername(), "/queue/messages", event);
        }
    }

    @MessageMapping("/chat.edit")
    public void editMessage(@Payload EditMessagePayload editPayload, Authentication authentication) {
        String senderUsername = authentication.getName();
        Message message = messageRepository.findById(editPayload.getMessageId()).orElseThrow();
        
        if (message.getSender().getUsername().equals(senderUsername)) {
            message.setContent(editPayload.getNewContent());
            message.setEditedAt(LocalDateTime.now());
            Message savedMessage = messageRepository.save(message);
            MessageEvent event = new MessageEvent("EDIT", savedMessage);
            
            for (User u : message.getChat().getUsers()) {
                messagingTemplate.convertAndSendToUser(u.getUsername(), "/queue/messages", event);
            }
        }
    }

    @MessageMapping("/chat.read")
    public void readMessage(@Payload ReadReceiptPayload readPayload, Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        Message message = messageRepository.findById(readPayload.getMessageId()).orElseThrow();
        
        if (!message.getReadBy().contains(user)) {
            message.getReadBy().add(user);
            Message savedMessage = messageRepository.save(message);
            MessageEvent event = new MessageEvent("READ", savedMessage);
            
            for (User u : message.getChat().getUsers()) {
                messagingTemplate.convertAndSendToUser(u.getUsername(), "/queue/messages", event);
            }
        }
    }
    
    @GetMapping("/api/chats")
    public ResponseEntity<List<Chat>> getUserChats(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        // Force lazy initialization or use DTOs in real app, returning entity directly can cause recursion
        // For simplicity, let's just return the chats, but we need to watch out for infinite JSON recursion
        return ResponseEntity.ok(user.getChats().stream().collect(Collectors.toList()));
    }

    @GetMapping("/api/chats/{chatId}/messages")
    public ResponseEntity<List<Message>> getChatMessages(@PathVariable Long chatId) {
        return ResponseEntity.ok(messageRepository.findByChatIdOrderByTimestampAsc(chatId));
    }

    @PostMapping("/api/chats")
    public ResponseEntity<Chat> createChat(@RequestBody CreateChatRequest request, Authentication authentication) {
        User creator = userRepository.findByUsername(authentication.getName()).orElseThrow();
        
        Chat chat = new Chat();
        chat.setName(request.getName());
        chat.setGroupChat(request.isGroupChat());
        
        Set<User> users = request.getUsernames().stream()
                .map(username -> userRepository.findByUsername(username).orElse(null))
                .filter(u -> u != null)
                .collect(Collectors.toSet());
        
        users.add(creator);
        chat.setUsers(users);
        
        Chat savedChat = chatRepository.save(chat);
        return ResponseEntity.ok(savedChat);
    }
}

@Data
class ChatMessagePayload {
    private Long chatId;
    private String content;
    private String type; // TEXT or IMAGE
    private String imageUrl;
}

@Data
class EditMessagePayload {
    private Long messageId;
    private String newContent;
}

@Data
class ReadReceiptPayload {
    private Long messageId;
    private Long chatId;
}

@Data
@AllArgsConstructor
class MessageEvent {
    private String eventType; // NEW, EDIT, READ
    private Object payload; // Can be a Message object or a read receipt update
}

@Data
class CreateChatRequest {
    private String name;
    private boolean isGroupChat;
    private List<String> usernames;
}

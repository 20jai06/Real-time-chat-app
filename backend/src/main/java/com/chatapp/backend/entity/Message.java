package com.chatapp.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String content;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"chats"})
    private User sender;

    @ManyToOne
    @JoinColumn(name = "chat_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"messages", "users"})
    private Chat chat;

    private LocalDateTime timestamp = LocalDateTime.now();
    
    private LocalDateTime editedAt;
    
    private String type = "TEXT"; // TEXT or IMAGE
    
    @Column(columnDefinition = "TEXT")
    private String imageUrl;
    
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "message_read_receipts",
        joinColumns = @JoinColumn(name = "message_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"chats"})
    private Set<User> readBy = new HashSet<>();
}

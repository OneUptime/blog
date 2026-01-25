# How to Build Real-Time Apps with WebSocket STOMP in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring, WebSocket, STOMP, Real-time

Description: Learn how to build real-time applications using WebSocket and STOMP protocol in Spring Boot. This guide covers configuration, message handling, security, and production deployment patterns.

---

> Real-time communication has become essential for modern applications. Whether you're building a chat system, live notifications, collaborative editing, or a dashboard with live updates, WebSockets provide the persistent, bidirectional connection you need. Spring Boot makes this straightforward with built-in support for WebSocket and STOMP.

STOMP (Simple Text Oriented Messaging Protocol) sits on top of WebSocket and provides a message-oriented abstraction. Think of WebSocket as the transport layer and STOMP as the messaging layer. This combination gives you the low-latency benefits of WebSocket with the structured messaging capabilities of a proper protocol.

---

## Setting Up Your Project

First, add the required dependency to your `pom.xml`:

```xml
<!-- Spring WebSocket dependency with STOMP support -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

---

## WebSocket Configuration

The configuration class sets up the message broker and defines endpoints. The message broker handles routing messages between clients and the server.

```java
// WebSocketConfig.java
// Configures WebSocket with STOMP messaging protocol
package com.example.realtime.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker  // Enables WebSocket message handling backed by a message broker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable a simple in-memory message broker
        // Messages with destinations starting with /topic or /queue go to the broker
        registry.enableSimpleBroker("/topic", "/queue");

        // Messages with /app prefix are routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");

        // User-specific messages use /user prefix
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the /ws endpoint for WebSocket connections
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // Configure CORS for your needs
                .withSockJS();  // Enable SockJS fallback for browsers without WebSocket
    }
}
```

The broker prefixes matter:
- `/topic` is for broadcasting to multiple subscribers (one-to-many)
- `/queue` is for point-to-point messaging (one-to-one)
- `/app` routes messages to your controller methods

---

## Message DTOs

Define your message classes. These are simple POJOs that Spring automatically serializes to JSON.

```java
// ChatMessage.java
// Data transfer object for chat messages
package com.example.realtime.model;

public class ChatMessage {
    private String content;
    private String sender;
    private MessageType type;

    public enum MessageType {
        CHAT, JOIN, LEAVE
    }

    // Default constructor required for JSON deserialization
    public ChatMessage() {}

    public ChatMessage(String content, String sender, MessageType type) {
        this.content = content;
        this.sender = sender;
        this.type = type;
    }

    // Getters and setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
}
```

---

## Message Controller

The controller handles incoming STOMP messages and broadcasts them to subscribers. The `@MessageMapping` annotation works similarly to `@RequestMapping` but for WebSocket messages.

```java
// ChatController.java
// Handles WebSocket messages and broadcasts to subscribers
package com.example.realtime.controller;

import com.example.realtime.model.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    // Handles messages sent to /app/chat.sendMessage
    // Broadcasts the message to all subscribers of /topic/public
    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        // Message is automatically serialized to JSON and sent to all subscribers
        return chatMessage;
    }

    // Handles user join events
    // Stores username in WebSocket session for later use
    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(
            @Payload ChatMessage chatMessage,
            SimpMessageHeaderAccessor headerAccessor) {

        // Store username in the WebSocket session attributes
        // This is useful for tracking who disconnects later
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());

        return chatMessage;
    }
}
```

---

## Sending Messages Programmatically

Sometimes you need to send messages outside of a message handler - from a scheduled task, a REST endpoint, or an event listener. Use `SimpMessagingTemplate` for this.

```java
// NotificationService.java
// Service for sending WebSocket messages programmatically
package com.example.realtime.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    // Inject the messaging template
    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Broadcast to all subscribers of a topic
    public void broadcastNotification(String message) {
        messagingTemplate.convertAndSend("/topic/notifications", message);
    }

    // Send a private message to a specific user
    // The user must be authenticated for this to work
    public void sendToUser(String username, String message) {
        // Spring routes this to /user/{username}/queue/private
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/private",
            message
        );
    }

    // Send to a dynamic topic - useful for room-based chat
    public void sendToRoom(String roomId, Object payload) {
        messagingTemplate.convertAndSend("/topic/room/" + roomId, payload);
    }
}
```

---

## Handling Connection Events

Track when users connect and disconnect. This is useful for presence features and cleanup tasks.

```java
// WebSocketEventListener.java
// Listens for WebSocket connection and disconnection events
package com.example.realtime.listener;

import com.example.realtime.model.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);
    private final SimpMessageSendingOperations messagingTemplate;

    public WebSocketEventListener(SimpMessageSendingOperations messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        logger.info("New WebSocket connection established");
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        // Retrieve username from session attributes (stored during join)
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (username != null) {
            logger.info("User disconnected: {}", username);

            // Notify other users about the disconnection
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setType(ChatMessage.MessageType.LEAVE);
            chatMessage.setSender(username);

            messagingTemplate.convertAndSend("/topic/public", chatMessage);
        }
    }
}
```

---

## Adding Security

WebSocket connections should be secured just like HTTP endpoints. Configure Spring Security to authenticate WebSocket connections.

```java
// WebSocketSecurityConfig.java
// Security configuration for WebSocket endpoints
package com.example.realtime.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry;
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer;

@Configuration
public class WebSocketSecurityConfig extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        messages
            // Allow anyone to connect to the WebSocket endpoint
            .simpDestMatchers("/app/**").authenticated()
            // Require authentication to subscribe to topics
            .simpSubscribeDestMatchers("/topic/**").authenticated()
            .simpSubscribeDestMatchers("/queue/**").authenticated()
            // User-specific destinations require authentication
            .simpSubscribeDestMatchers("/user/**").authenticated()
            // Deny everything else by default
            .anyMessage().denyAll();
    }

    @Override
    protected boolean sameOriginDisabled() {
        // Disable CSRF for WebSocket - handle CORS in your configuration
        return true;
    }
}
```

---

## JavaScript Client

Here is how to connect from the browser using SockJS and STOMP.js:

```javascript
// websocket-client.js
// Browser client for connecting to Spring WebSocket server

// Connect to the WebSocket endpoint
const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);

// Connection configuration
stompClient.connect({}, function(frame) {
    console.log('Connected: ' + frame);

    // Subscribe to public messages
    stompClient.subscribe('/topic/public', function(message) {
        const chatMessage = JSON.parse(message.body);
        displayMessage(chatMessage);
    });

    // Subscribe to private messages (user-specific)
    stompClient.subscribe('/user/queue/private', function(message) {
        const privateMessage = JSON.parse(message.body);
        displayPrivateMessage(privateMessage);
    });

    // Notify server that user has joined
    stompClient.send('/app/chat.addUser', {}, JSON.stringify({
        sender: username,
        type: 'JOIN'
    }));
});

// Send a message
function sendMessage(content) {
    stompClient.send('/app/chat.sendMessage', {}, JSON.stringify({
        sender: username,
        content: content,
        type: 'CHAT'
    }));
}

// Handle connection errors
stompClient.onStompError = function(frame) {
    console.error('STOMP error: ' + frame.headers['message']);
};
```

---

## Production Considerations

When deploying to production, consider these important factors:

**External Message Broker**: The simple in-memory broker works for single instances but does not scale horizontally. For multiple server instances, use RabbitMQ or ActiveMQ:

```java
@Override
public void configureMessageBroker(MessageBrokerRegistry registry) {
    // Use RabbitMQ as external broker for horizontal scaling
    registry.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("rabbitmq-host")
            .setRelayPort(61613)
            .setClientLogin("guest")
            .setClientPasscode("guest");

    registry.setApplicationDestinationPrefixes("/app");
}
```

**Session Management**: Track active sessions for cleanup and monitoring. Consider storing session information in Redis for distributed deployments.

**Heartbeats**: Configure heartbeats to detect stale connections. Both the server and client should send periodic heartbeats.

**Rate Limiting**: Protect against message flooding by limiting the number of messages per user per second.

---

## Conclusion

Spring's WebSocket support with STOMP provides a solid foundation for building real-time applications. The key takeaways:

- STOMP adds structure to WebSocket communication with clear message routing
- Use `/topic` for broadcast and `/queue` for direct messaging
- `SimpMessagingTemplate` enables programmatic message sending
- Event listeners help track user presence
- External message brokers are essential for horizontal scaling

Start with the simple broker for development, then switch to RabbitMQ or a similar solution when you need to scale across multiple server instances.

---

*Building real-time applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for WebSocket connections and message throughput.*

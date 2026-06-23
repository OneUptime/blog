# Validation Summary: How to Set Up WebSocket in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot 3.x (Spring WebSocket / `spring-boot-starter-websocket`)
- STOMP messaging protocol
- SockJS (browser fallback transport)
- Spring Messaging (`SimpMessagingTemplate`, `@MessageMapping`, `@SendTo`, channel interceptors)
- Spring Security (JWT authentication over the STOMP CONNECT frame)
- Lombok (`@Data`, `@Builder`, etc.)
- Jackson (JSON serialization)
- SockJS / stomp.js JavaScript clients
- JUnit 5 + `WebSocketStompClient` integration testing

## Sources Consulted
- Spring Framework Reference — WebSocket / STOMP support: https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html
- Spring `WebSocketMessageBrokerConfigurer` API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/config/annotation/WebSocketMessageBrokerConfigurer.html
- Spring `StompEndpointRegistration` API (`setAllowedOriginPatterns`, `withSockJS`): https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/config/annotation/StompWebSocketEndpointRegistration.html
- Spring `WebSocketStompClient` / `connectAsync` API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/messaging/WebSocketStompClient.html
- Spring Boot `@LocalServerPort` (Boot 3.2+ relocation to `org.springframework.boot.test.web.server`): https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/web/server/LocalServerPort.html
- Spring Boot issue #29589 (relocation of `@Local*Port` to spring-boot-test): https://github.com/spring-projects/spring-boot/issues/29589
- Spring guide "Using WebSocket to build an interactive web application": https://spring.io/guides/gs/messaging-stomp-websocket

## Issues Found
No technical issues found.

The post was checked closely for the common ways Spring WebSocket tutorials go stale, and it is current:
- Uses `WebSocketMessageBrokerConfigurer` (interface) rather than the long-removed `AbstractWebSocketMessageBrokerConfigurer`.
- Uses `setAllowedOriginPatterns("*")` rather than the invalid `setAllowedOrigins("*")` combination (Spring rejects `"*"` origins together with credentials; the pattern form is the correct current API).
- Uses `connectAsync(...)` returning `CompletableFuture` rather than the deprecated `connect(...)` returning `ListenableFuture`.
- Imports `@LocalServerPort` from `org.springframework.boot.test.web.server`, which is the correct package for Spring Boot 3.2+ (it was relocated from `org.springframework.boot.web.server`).
- STOMP destination routing (`/app`, `/topic`, `/queue`, `/user` prefixes), `convertAndSendToUser`, `@DestinationVariable`, `SimpMessageHeaderAccessor`, `StompHeaderAccessor.wrap`, and `MessageHeaderAccessor.getAccessor` are all used correctly and match official semantics.

## Review Notes
- The "Message DTOs" snippet shows two top-level public classes (`ChatMessage` and `ChatNotification`) in a single code block. These are clearly intended as separate `.java` files in the shared `com.example.dto` package (a standard blog presentation convention), not as a single compilation unit — Java only permits one public top-level class per file. No change made, since the post does not claim they live in one file.
- For private messaging via `convertAndSendToUser` / `/user/queue/private` to work, the WebSocket session needs an associated `Principal` (set during authentication, as shown in the `AuthChannelInterceptor`). The simple chat flow only stores `username` as a session attribute, so the private-message path depends on the authentication section being wired up. This is an accurate-but-worth-noting nuance, not an error.
- The JavaScript client uses the legacy `stompjs@2` (`Stomp.over(socket)`) API, which is correct for that library version and matches the loaded CDN script. Newer projects may prefer `@stomp/stompjs` v7, but the post's pairing of CDN script and API is internally consistent and functional.
- The explicit `jackson-databind` dependency is redundant when `spring-boot-starter-web`/`spring-boot-starter-websocket` are present (Jackson is pulled in transitively), but it is harmless and not incorrect.

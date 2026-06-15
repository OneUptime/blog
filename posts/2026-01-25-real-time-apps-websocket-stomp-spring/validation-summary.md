# Validation Summary: How to Build Real-Time Apps with WebSocket STOMP in Spring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Framework WebSocket support
- STOMP
- SockJS
- Spring Security
- RabbitMQ and ActiveMQ STOMP broker relay

## Sources Consulted
- Spring guide, "Using WebSocket to build an interactive web application": https://spring.io/guides/gs/messaging-stomp-websocket/
- Spring Framework reference, STOMP over WebSocket overview and message broker configuration: https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html
- Spring Framework reference, STOMP broker relay: https://docs.spring.io/spring-framework/reference/web/websocket/stomp/handle-broker-relay.html
- Spring Framework reference, user destinations: https://docs.spring.io/spring-framework/reference/web/websocket/stomp/user-destination.html
- Spring Security reference, WebSocket security: https://docs.spring.io/spring-security/reference/servlet/integrations/websocket.html
- Spring Security API documentation for deprecated `AbstractSecurityWebSocketMessageBrokerConfigurer`: https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/config/annotation/web/socket/AbstractSecurityWebSocketMessageBrokerConfigurer.html

## Issues Found
- The security example used `AbstractSecurityWebSocketMessageBrokerConfigurer`, which is deprecated in current Spring Security. Replaced it with the documented `@EnableWebSocketSecurity` plus `AuthorizationManager<Message<?>>` bean configuration.
- The security example comment said anyone could connect while the surrounding text described authenticated WebSocket connections. Updated the matcher to authenticate destination-less messages such as `CONNECT` and clarified the comment.
- The old security example disabled same-origin/CSRF protection through `sameOriginDisabled()`. Replaced it with the current API and added a note that `@EnableWebSocketSecurity` requires a CSRF token in inbound STOMP `CONNECT` frames by default.
- The post described `/queue` as strictly one-to-one. Adjusted the wording to say it is commonly used for point-to-point or user-specific messaging, which better matches Spring's destination-prefix behavior and user-destination support.

## Review Notes
The main WebSocket configuration, DTO, controller, `SimpMessagingTemplate`, event listener, JavaScript client pattern, and broker relay example are consistent with Spring's documented STOMP-over-WebSocket support. The JavaScript client uses the classic STOMP.js style; future updates could consider showing the newer `@stomp/stompjs` `Client` API, but the current example remains understandable in context.

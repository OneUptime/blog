# Validation Summary: How to Build gRPC Services in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- gRPC Java
- grpc-spring-boot-starter
- Protocol Buffers
- Maven
- HTTP/2

## Sources Consulted
- gRPC-Spring-Boot-Starter documentation: https://grpc-ecosystem.github.io/grpc-spring/en/
- gRPC-Spring-Boot-Starter server getting started guide: https://grpc-ecosystem.github.io/grpc-spring/en/server/getting-started.html
- gRPC-Spring-Boot-Starter server configuration guide: https://grpc-ecosystem.github.io/grpc-spring/en/server/configuration.html
- gRPC-Spring-Boot-Starter server security guide: https://grpc-ecosystem.github.io/grpc-spring/en/server/security.html
- gRPC-Spring-Boot-Starter client getting started guide: https://grpc-ecosystem.github.io/grpc-spring/en/client/getting-started.html
- gRPC-Spring-Boot-Starter client configuration guide: https://grpc-ecosystem.github.io/grpc-spring/en/client/configuration.html
- Spring gRPC getting started guide: https://docs.spring.io/spring-grpc/reference/getting-started.html
- gRPC Java README and Maven code generation guidance: https://github.com/grpc/grpc-java
- Maven Protocol Buffers Plugin usage documentation: https://www.xolstice.org/protobuf-maven-plugin/usage.html
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The Maven dependency block omitted the Java 9+ annotation API dependency recommended by the grpc-spring starter documentation for gRPC generated code. Added `jakarta.annotation:jakarta.annotation-api:1.3.5` as an optional dependency.
- The client-streaming Java example used `batchCreateUsers` and `BatchCreateResponse`, but the `.proto` example did not define the corresponding RPC or response message. Added `BatchCreateResponse` and `rpc BatchCreateUsers(stream CreateUserRequest) returns (BatchCreateResponse);` to the proto definition.
- The client-streaming example called an undefined `createUser(request)` helper with the wrong shape for the previously shown unary service method. Replaced it with the same entity creation and repository save pattern used earlier in the post.

## Review Notes
- The post uses the community `net.devh` grpc-spring-boot-starter, and the shown annotations and `grpc.server.*` / `grpc.client.*` properties are consistent with that library. Spring now also has official Spring gRPC documentation and starters, so a future refresh could mention that option for new projects.
- The gRPC Java and protobuf versions shown are not the latest as of 2026-06-12, but the examples use stable APIs and are technically valid for the versions discussed.

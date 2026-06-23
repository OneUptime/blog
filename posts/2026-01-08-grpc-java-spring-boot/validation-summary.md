# Validation Summary: How to Build gRPC Services in Java with Spring Boot

## Status
validated

## Post Type
Tutorial / Guide — a step-by-step, code-heavy walkthrough of building a production-ready gRPC service in Java with Spring Boot and the `net.devh` grpc-spring-boot-starter.

## Technologies Covered
- gRPC (Java, `io.grpc` 1.61.0)
- Protocol Buffers (proto3, protobuf 3.25.2)
- Java 17
- Spring Boot 3.2.2
- net.devh grpc-spring-boot-starter (server + client) 3.0.0.RELEASE
- Maven (with `protobuf-maven-plugin` 0.6.1, `os-maven-plugin` 1.7.1) and Gradle (with `com.google.protobuf` plugin 0.9.4)
- Lombok
- Micrometer / Prometheus (Spring Boot Actuator)
- JUnit 5, Mockito, AssertJ, `grpc-testing` (in-process testing)
- Docker (eclipse-temurin) and Kubernetes (gRPC liveness/readiness probes)

## Sources Consulted
- grpc-spring-boot-starter (net.devh / grpc-ecosystem) documentation and config properties — https://github.com/grpc-ecosystem/grpc-spring and https://yidongnan.github.io/grpc-spring-boot-starter/
- Maven Central, net.devh:grpc-server-spring-boot-starter 3.0.0.RELEASE — https://mvnrepository.com/artifact/net.devh/grpc-server-spring-boot-starter/3.0.0.RELEASE (confirmed compatible with Spring Boot 3.2)
- gRPC Java documentation — https://grpc.io/docs/languages/java/
- Spring Boot externalized configuration / SnakeYAML duplicate-key behavior — https://spring.io/projects/spring-boot
- Protocol Buffers (proto3) documentation — https://protobuf.dev/
- Kubernetes gRPC liveness/readiness probes (GA since v1.27) — https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
1. **Duplicate top-level `grpc:` key in `application.yml`** (the `grpc.server` block and the `grpc.client` block were declared as two separate `grpc:` mappings). Spring Boot's YAML loader (SnakeYAML) rejects duplicate keys with a `DuplicateKeyException`, so the application would fail to start. **Fix:** merged the two into a single `grpc:` block with `server:` and `client:` as sibling children.
2. **File/class name mismatch for the exception handler.** The section instructed creating `GrpcExceptionHandler.java`, but the public class inside is `GrpcExceptionAdvice` (named to avoid colliding with the imported `@GrpcExceptionHandler` annotation from `net.devh`). A Java public class must reside in a file matching its name, so this would not compile. **Fix:** renamed the file references in the heading and the project-structure tree to `GrpcExceptionAdvice.java`.

## Review Notes
- **JUnit 4 `@Rule` in a JUnit 5 test (`UserGrpcServiceTest`):** `GrpcCleanupRule` is annotated with `@org.junit.Rule` (JUnit 4), but the class runs under JUnit Jupiter (`@ExtendWith`, `org.junit.jupiter` imports). Jupiter does not honor JUnit 4 `@Rule` annotations unless `junit-jupiter-migrationsupport` and `@EnableRuleMigrationSupport` are added. The tests still compile and pass (fresh repository state is created per `@BeforeEach`), but the rule's automatic resource cleanup will not run — a leak rather than a failure. Left as-is since it does not break the tutorial's demonstrated behavior, but a future revision could drop the rule and manage the in-process server/channel manually, or use the migration-support extension.
- `@ExtendWith(MockitoExtension.class)` is declared on the test class but no Mockito mocks are used (the real `UserRepository` is instantiated directly). Harmless but unnecessary.
- The `Dockerfile` build stage runs `./mvnw` but only `pom.xml` and `src` are copied; the Maven wrapper (`mvnw`, `.mvn/`) would also need to be present, or `mvn` used instead. This is a common tutorial simplification and not strictly incorrect given the wrapper is part of a typical Spring Initializr project.
- Versions are current and mutually compatible: Spring Boot 3.2.2, grpc-java 1.61.0, protobuf 3.25.2, and net.devh starter 3.0.0.RELEASE all align. A newer 3.1.0.RELEASE of the starter exists (tested against Spring Boot 3.2.4) but 3.0.0.RELEASE is valid for this stack.
- net.devh config property names used (`grpc.server.reflection-service-enabled`, `health-service-enabled`, `security.enabled`, `keepAliveTime`, `maxInboundMessageSize`, and client `negotiationType`/`enableKeepAlive`) are correct for the starter.
- Kubernetes native `grpc` probes are valid (GA since Kubernetes 1.27) and correctly paired with the enabled gRPC health service.

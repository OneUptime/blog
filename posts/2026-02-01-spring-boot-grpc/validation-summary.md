# Validation Summary: How to Use gRPC with Spring Boot

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Java
- Spring Boot 3.2.0
- gRPC (grpc-java 1.59.0)
- Protocol Buffers (protoc 3.24.0, proto3 syntax)
- `net.devh:grpc-spring-boot-starter` 2.15.0.RELEASE
- protobuf-maven-plugin 0.6.1
- os-maven-plugin 1.7.1
- JUnit 5 (Jupiter)
- Maven build configuration (YAML configuration via Spring Boot)

## Sources Consulted
- grpc-java official documentation: https://grpc.io/docs/languages/java/
- grpc-java GitHub: https://github.com/grpc/grpc-java
- net.devh grpc-spring-boot-starter docs: https://yidongnan.github.io/grpc-spring-boot-starter/en/
- net.devh grpc-spring-boot-starter GitHub: https://github.com/yidongnan/grpc-spring-boot-starter
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- protobuf-maven-plugin: https://www.xolstice.org/protobuf-maven-plugin/
- JUnit 5 user guide: https://junit.org/junit5/docs/current/user-guide/
- gRPC status codes reference: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
- Maven Central for version verification of all dependencies

## Issues Found
1. **Incorrect library attribution**: The post described the `grpc-spring-boot-starter` library as "from LogNet", but the dependency used (`net.devh:grpc-spring-boot-starter`) and all subsequent imports (`net.devh.boot.grpc.server.service.GrpcService`, `net.devh.boot.grpc.client.inject.GrpcClient`, `net.devh.boot.grpc.server.advice.GrpcAdvice`, etc.) are for the yidongnan-maintained library, NOT LogNet's. LogNet's gRPC starter has the groupId `io.github.lognet` and a different annotation set. Fixed by updating the attribution to "by yidongnan (`net.devh`)" which matches the actual dependency and imports used throughout the post.

2. **JUnit 4 / JUnit 5 mixup in test code**: The unit test imported `org.junit.Rule` (JUnit 4) and used `@Rule public final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();` together with `@BeforeEach`, `@Test` from `org.junit.jupiter.api.*` (JUnit 5). JUnit 5 does not honor `@Rule` annotations — `GrpcCleanupRule` is a JUnit 4 `TestRule` and would never execute, leaving server/channel resources leaking between tests. Fixed by removing the `GrpcCleanupRule` import and `@Rule` field, storing the `Server` and `ManagedChannel` in instance fields, and adding a proper JUnit 5 `@AfterEach tearDown()` method that calls `shutdownNow().awaitTermination(...)` on both. Added the missing `io.grpc.Server` and `java.util.concurrent.TimeUnit` imports needed by the rewritten cleanup logic.

## Review Notes
- All Maven coordinates and versions verified against Maven Central: `net.devh:grpc-spring-boot-starter:2.15.0.RELEASE`, `io.grpc:grpc-netty-shaded:1.59.0`, `io.grpc:grpc-protobuf:1.59.0`, `io.grpc:grpc-stub:1.59.0`, `io.grpc:grpc-testing:1.59.0`, `com.google.protobuf:protoc:3.24.0`, `io.grpc:protoc-gen-grpc-java:1.59.0`, `org.xolstice.maven.plugins:protobuf-maven-plugin:0.6.1`, `kr.motd.maven:os-maven-plugin:1.7.1` — all real and mutually compatible.
- The proto3 schema is syntactically correct. Snake-case field names (`user_id`, `created_at`) correctly map to camel-case Java accessors (`getUserId()`, `getCreatedAt()`) used in the service implementation.
- Server-side and client-side `StreamObserver`, `Status`, `StatusRuntimeException`, `withDeadlineAfter`, and `withCompression("gzip")` API usage is correct for grpc-java 1.59.
- `@GrpcAdvice` / `@GrpcExceptionHandler` package paths (`net.devh.boot.grpc.server.advice.*`) are correct for the net.devh starter 2.x.
- The YAML configuration keys (`grpc.server.port`, `enable-keep-alive`, `keep-alive-time`, `keep-alive-timeout`, `permit-keep-alive-without-calls`, `grpc.client.<name>.address`, `negotiation-type`, `default-load-balancing-policy`) are accurate for `net.devh:grpc-spring-boot-starter` 2.15.x.
- The integration-test snippet sets `grpc.server.in-process-name=test` and injects `@GrpcClient("in-process-test")`. For this to actually connect, the reader would normally also need a `grpc.client.in-process-test.address=in-process:test` property (or rely on the starter's name-matching convention). This was left as-is because it is a partial snippet and not technically incorrect — just incomplete for a copy-paste runnable example.
- `grpc-testing` is still listed as a test dependency but is no longer used after the JUnit 5 fix. Left in place to avoid scope creep; the reader can drop it if they prefer a leaner POM.
- The custom `Empty` message is fine, though `google.protobuf.Empty` (well-known type) is the more idiomatic choice. Not flagged as an error.
- Spring Boot 3.2.0 is on Java 17+. The net.devh starter 2.15.0.RELEASE supports Spring Boot 3.x — no compatibility issue.

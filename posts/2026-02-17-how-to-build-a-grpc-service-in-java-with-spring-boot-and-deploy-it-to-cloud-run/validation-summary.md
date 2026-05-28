# Validation Summary: How to Build a gRPC Service in Java with Spring Boot and Deploy It to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- grpc-spring-boot-starter / grpc-spring
- gRPC Java
- Protocol Buffers
- Maven
- Docker
- Google Cloud Run
- Google Cloud CLI
- grpcurl

## Sources Consulted
- Cloud Run gRPC documentation: https://docs.cloud.google.com/run/docs/triggering/grpc
- Cloud Run HTTP/2 documentation: https://docs.cloud.google.com/run/docs/configuring/http2
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run health checks documentation: https://docs.cloud.google.com/run/docs/configuring/healthchecks
- Google Cloud CLI `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- grpc-spring GitHub documentation: https://github.com/grpc-ecosystem/grpc-spring
- grpc-spring version matrix: https://grpc-ecosystem.github.io/grpc-spring/en/versions.html
- grpc-spring server configuration documentation: https://yidongnan.github.io/grpc-spring-boot-starter/en/server/configuration.html
- grpc-spring server getting started documentation: https://yidongnan.github.io/grpc-spring-boot-starter/en/server/getting-started.html
- grpc-spring `GrpcServerProperties` API: https://javadoc.io/page/net.devh/grpc-server-spring-boot-starter/latest/net/devh/boot/grpc/server/config/GrpcServerProperties.html
- gRPC Java documentation: https://grpc.io/docs/languages/java/
- gRPC Java basics tutorial: https://grpc.io/docs/languages/java/basics/
- Protocol Buffers Maven Plugin API: https://www.xolstice.org/protobuf-maven-plugin/apidocs/org/xolstice/maven/plugin/protobuf/package-summary.html
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/

## Issues Found
- The post used `grpc-server-spring-boot-starter` version `2.15.0.RELEASE`, while the current grpc-spring documentation lists `3.1.0.RELEASE` as the current release line for Spring Boot 3.x. Updated the starter version to `3.1.0.RELEASE`.
- The gRPC Java dependencies and `protoc-gen-grpc-java` plugin were set to `1.60.0`. Updated them to `1.63.0` to match the grpc-spring `3.1.0` documented build version.
- The Protocol Buffer contract declared an `UpdateProduct` RPC, but the Java service implementation did not override `updateProduct`, so calls to that RPC would return the generated unimplemented response. Added an `updateProduct` implementation.
- The `application.properties` snippet included Spring Boot Actuator HTTP health-check settings without adding Actuator dependencies or configuring Cloud Run HTTP probes. Removed those lines and kept the gRPC health service configuration, which matches Cloud Run's documented gRPC probe support.

## Review Notes
- The Java implementation remains a tutorial snippet and omits package/import declarations. The referenced APIs and method names are valid, but a complete source file would need the usual imports for generated protobuf classes, `StreamObserver`, `Status`, `UUID`, `Instant`, `Map`, and `ConcurrentHashMap`.
- Cloud Run's documentation recommends HTTP/2 for gRPC and notes that streaming and metadata require it. This tutorial uses server streaming, so deploying with `--use-http2` is appropriate.
- Reflection is useful for `grpcurl`, but it should be disabled or restricted for production services that should not expose protobuf descriptors publicly.

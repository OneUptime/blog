# Validation Summary: How to Configure gRPC Servers with IPv6 in Java

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- gRPC
- `grpc-java`
- `grpc-netty-shaded`
- Spring Boot
- `grpc-spring-boot-starter`
- `grpcurl`
- IPv6

## Sources Consulted
- Java `InetAddress` Javadoc: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/InetAddress.html
- Java networking properties (`java.net.preferIPv4Stack`, IPv6 socket behavior): https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Java IPv6 networking guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/index.html
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC interceptors guide: https://grpc.io/docs/guides/interceptors/
- `grpcurl` README and usage examples: https://github.com/fullstorydev/grpcurl/blob/master/README.md
- `grpc-java` 1.63.0 Javadocs: https://javadoc.io/doc/io.grpc/grpc-api/1.63.0/index.html
- `grpc-netty-shaded` 1.63.0 Javadocs: https://javadoc.io/doc/io.grpc/grpc-netty-shaded/1.63.0/index.html
- `grpc-java` 1.63.0 API source jar (`Grpc`, `ServerCall`, `Context`, `Contexts`): https://repo1.maven.org/maven2/io/grpc/grpc-api/1.63.0/grpc-api-1.63.0-sources.jar
- `grpc-spring` server configuration docs: https://grpc-ecosystem.github.io/grpc-spring/en/server/configuration.html
- `grpc-spring` client configuration docs: https://grpc-ecosystem.github.io/grpc-spring/en/client/configuration.html
- `grpc-server-spring-boot-starter` 3.1.0.RELEASE source jar (`GrpcServerProperties`, `GrpcService`): https://repo1.maven.org/maven2/net/devh/grpc-server-spring-boot-starter/3.1.0.RELEASE/grpc-server-spring-boot-starter-3.1.0.RELEASE-sources.jar
- `grpc-client-spring-boot-starter` 3.1.0.RELEASE source jar (`StaticNameResolverProvider`): https://repo1.maven.org/maven2/net/devh/grpc-client-spring-boot-starter/3.1.0.RELEASE/grpc-client-spring-boot-starter-3.1.0.RELEASE-sources.jar

## Issues Found
- The original remote-address example in Step 2 was not valid `grpc-java`. It attempted to call `Grpc.TRANSPORT_ATTR_REMOTE_ADDR.get(...)` directly on the attribute key and against `Attributes.EMPTY`, which would not produce the peer address and would not compile as written. I changed the post to use a `ServerInterceptor` plus `Context`, which is the supported pattern for carrying transport attributes into service code.
- The original Step 5 example used `ServerInterceptors.CALL_SERVER_CALL.get()`, which is not a public `grpc-java` API. I replaced that snippet with a working `GrpcClientAddressInterceptor` that reads `call.getAttributes().get(Grpc.TRANSPORT_ATTR_REMOTE_ADDR)` and exposes it via `Context`.
- The plain `grpc-java` server snippet did not actually wire in the interceptor needed by the later client-address example. I added `.intercept(new GrpcClientAddressInterceptor())` so the address-extraction flow is internally consistent.
- The Spring Boot server configuration used `grpc.server.address: "[::]"`, but the starter’s documented bind value for “any IPv6 address” is `::`, not bracketed URI form. I changed the server address to `::`. I kept bracketed IPv6 notation for the client URI because the starter’s static resolver parses the client target as a URI authority.
- The client and `grpcurl` examples used `2001:db8::1`, which is the documentation prefix and does not match the local server started earlier in the tutorial. I changed those examples to `::1` so the tutorial’s local test flow is coherent.
- The `grpcurl` invocation example for `SayHello` was incomplete because unary methods with non-empty request messages need `-d` input. I added `-d '{"name":"World"}'`.
- The `grpcurl` examples implied they would work directly against the sample server, but `grpcurl` needs server reflection or explicit proto descriptors, and the health-check call also requires the health service to be registered. I added those caveats in the testing section.
- The monitoring section implied a gRPC health endpoint would always exist. I qualified that advice so it only recommends health checks if the service actually registers the gRPC health service.
- The conclusion overstated IPv6 behavior by implying all Java gRPC features work “transparently” and by using bracket notation for the Spring server bind value. I corrected the Spring syntax and qualified the dual-stack statement to reflect Java’s documented dependence on JVM and OS socket settings.

## Review Notes
- `Grpc.TRANSPORT_ATTR_REMOTE_ADDR`, `ServerCall.getAttributes()`, and `Contexts.interceptCall(...)` are public `grpc-java` APIs, but some of the transport-attribute surface is marked `@ExperimentalApi` in the 1.63.0 source. The corrected example is valid for the version used in the post, but future major revisions could adjust this area.
- `NettyChannelBuilder.forAddress(SocketAddress)` is valid for literal IPv6 addresses, though gRPC’s builder docs generally prefer host/port overloads when delayed DNS resolution matters.
- The `grpc-spring-boot-starter` version shown in the post, `3.1.0.RELEASE`, is accurate and available on Maven Central. The property names used in the corrected YAML match that release.
- This review was done against official documentation and published source artifacts. I did not run a local Java build for the snippets in this repository.

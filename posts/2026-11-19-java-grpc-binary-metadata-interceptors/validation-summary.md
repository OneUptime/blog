# Validation Summary: Read Binary gRPC Metadata in Java Interceptors Without ASCII Parsing Errors

## Status
validated

## Post Type
Technical debugging guide with a Java server interceptor example.

## Technologies Covered
- Java
- gRPC Java server interceptors and metadata
- HTTP/2 metadata encoding and Base64
- Protocol Buffers as a possible application-defined binary payload

## Sources Consulted
- [Java Metadata API](https://grpc.github.io/grpc-java/javadoc/io/grpc/Metadata.html)
- [Java Metadata.Key API](https://grpc.github.io/grpc-java/javadoc/io/grpc/Metadata.Key.html)
- [Java Metadata.AsciiMarshaller API](https://grpc.github.io/grpc-java/javadoc/io/grpc/Metadata.AsciiMarshaller.html)
- [Java ServerInterceptor API](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptor.html)
- [Java ServerCallHandler API](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerCallHandler.html)
- [Java ServerBuilder API](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerBuilder.html)
- [gRPC HTTP/2 protocol](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
- The introduction described `ASCII_STRING_MARSHALLER` as suitable for “ordinary text,” which could include unsupported Unicode or control characters. Changed this to printable ASCII (`0x20`–`0x7E`) without leading or trailing spaces, matching the marshaller contract. The documentation warns that invalid values may be discarded or cause call failure, and boundary whitespace may not survive transport.

## Review Notes
- Statically reviewed the Java example against the official API signatures. Its generic interceptor method, imports, typed binary key, null check, iteration, and forwarding call are correct. The APIs used are not marked deprecated. No compilation or live RPC test was performed.
- Confirmed that binary key names must end in `-bin` and ASCII key names must not. Incorrect key construction can fail independently of a valid wire payload.
- Confirmed that `getAll()` exposes repeated values and returns null when absent, while `get()` selects the last value. The example reads metadata without modifying it and forwards the original call and headers.
- Confirmed that the runtime handles binary metadata Base64 encoding and decoding. A binary suffix identifies the representation, not the application payload schema.
- Confirmed that the raw-byte marshaller does not copy arrays and that Metadata is not thread-safe. Forwarding through `startCall()` transfers ownership to the next handler.
- The distinction between transport rejection and interceptor exceptions is valid; the interceptor API documents that an exception closes the call with an error. An absent entry log alone does not prove a transport failure, since registration or earlier handlers can also prevent entry.
- The proposed missing, empty, repeated, non-ASCII, and size-boundary fixtures are appropriate. Actual metadata limits are cumulative and transport-dependent; oversized-input behavior should be tested with the configured transport. These fixtures are recommendations in the post, not tests executed during this review.
- The post specifies no library version, terminal commands, or configuration snippets. All referenced documentation links and the author profile resolve to the intended resources.

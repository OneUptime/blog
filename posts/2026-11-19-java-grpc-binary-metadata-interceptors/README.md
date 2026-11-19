# How to Read Binary gRPC Metadata in Java Interceptors Without ASCII Parsing Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Java, Debugging, Protobuf

Description: Read Java gRPC binary metadata with correctly typed keys, preserve repeated values, and avoid decoding arbitrary headers as ASCII.

An interceptor that prints every gRPC header can accidentally break calls it was meant to diagnose. A common mistake is constructing an ASCII metadata key for every name, including names ending in `-bin`.

In Java, choose the marshaller from the metadata field's contract. The [Metadata API](https://grpc.github.io/grpc-java/javadoc/io/grpc/Metadata.html) uses `BINARY_BYTE_MARSHALLER` for raw bytes and `ASCII_STRING_MARSHALLER` for ordinary text. The suffix and marshaller must agree.

## Read a known binary field explicitly

This server interceptor records only whether an application diagnostic field is present and its byte length. It does not print credentials or arbitrary binary content.

```java
import io.grpc.*;

public final class DiagnosticMetadataInterceptor
        implements ServerInterceptor {
    private static final Metadata.Key<byte[]> DIAGNOSTIC =
        Metadata.Key.of("x-diagnostic-bin",
                        Metadata.BINARY_BYTE_MARSHALLER);

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        Iterable<byte[]> values = headers.getAll(DIAGNOSTIC);
        if (values != null) {
            for (byte[] value : values) {
                System.out.println("diagnostic bytes=" + value.length);
            }
        }
        return next.startCall(call, headers);
    }
}
```

Register it with the server using your existing interceptor mechanism. `getAll()` matters when a key can appear repeatedly; `get()` returns only the last value. Decide whether repeated values are allowed for each application field instead of silently treating the last one as authoritative.

## Do not add a second Base64 layer

Binary metadata has a Base64 representation on the HTTP/2 wire. gRPC's runtime handles that translation. The application-facing Java key returns the decoded bytes, so decoding those bytes as Base64 again is normally wrong.

Similarly, a sender using `BINARY_BYTE_MARSHALLER` should provide the intended bytes. Only Base64-encode at the application level if your own protocol explicitly says the binary payload contains Base64 text. The [gRPC HTTP/2 protocol](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md) explains the wire representation.

## Keep inspection separate from interpretation

A field ending in `-bin` might contain UTF-8, protobuf, compressed data, or an application-specific format. The suffix does not tell you which. Use a documented schema and size limit before parsing.

If you really need an inventory of all fields, record their names and representation type first. Use an allowlist for any values you decode or log. Treat `authorization`, cookies, session material, and opaque binary fields as sensitive by default in diagnostic code.

Do not mutate byte arrays returned by the binary marshaller. Make a copy if application code needs to retain and change a value. Also avoid passing the mutable `Metadata` container to an unrelated worker thread while the call path is still using it.

## Locate the failure boundary

Not every `failed to parse headers` error comes from your interceptor. If the request is rejected by the transport before the interceptor runs, inspect the sender, proxy, and field name/value encoding. Add a bounded entry log to distinguish transport rejection from an exception thrown inside diagnostic code.

Conversely, if removing the logging interceptor restores the call, reproduce it with one known `-bin` field before changing server limits. A correct transport payload can still trigger an invalid Java key construction.

## Test the troublesome values

Exercise missing metadata, empty bytes, repeated entries, bytes outside ASCII, and a large-but-permitted value. Assert that the interceptor forwards the call and preserves the metadata. Test oversized values separately to verify the configured rejection behavior.

Include a normal ASCII correlation ID in the fixture so that the code cannot accidentally treat every field as binary either.

## Conclusion

Use typed metadata keys, let gRPC handle wire encoding, and decode only fields whose application schema you know. Diagnostic middleware should observe a call without changing its success or exposing its secrets.

## Official Documentation

- [Java Metadata API](https://grpc.github.io/grpc-java/javadoc/io/grpc/Metadata.html)
- [Java ServerInterceptor API](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptor.html)
- [gRPC HTTP/2 metadata encoding](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)

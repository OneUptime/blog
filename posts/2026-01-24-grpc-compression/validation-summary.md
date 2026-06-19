# Validation Summary: How to Handle Compression in gRPC

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- gRPC compression
- gRPC-Go
- gRPC Python
- Protocol Buffers
- gzip
- custom gRPC compressors
- zstd
- Prometheus metrics

## Sources Consulted
- gRPC Compression guide: https://grpc.io/docs/guides/compression/
- gRPC-Go API reference: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go encoding API reference: https://pkg.go.dev/google.golang.org/grpc/encoding
- gRPC-Go compression documentation: https://github.com/grpc/grpc-go/blob/master/Documentation/compression.md
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html
- gRPC Python compression example: https://chromium.googlesource.com/external/github.com/grpc/grpc/+/HEAD/examples/python/compression/
- gRPC Core compression specification: https://grpc.github.io/grpc/core/md_doc_compression.html

## Issues Found
- The Go server example used deprecated `grpc.RPCCompressor`, `grpc.RPCDecompressor`, `grpc.NewGZIPCompressor`, and `grpc.NewGZIPDecompressor` APIs. Replaced this with current compressor registration behavior and `grpc.SetSendCompressor(ctx, gzip.Name)` for response compression.
- The Go client examples used deprecated `grpc.Dial` and `grpc.WithInsecure()`. Updated them to `grpc.NewClient` and `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The Go per-call disable example used the string `"identity"` directly. Updated it to `encoding.Identity`, which is the documented gRPC-Go identity compression name.
- Several Go snippets were missing required imports for the code shown. Added missing imports such as `context`, `log`, `grpc`, `insecure`, and the placeholder protobuf package where needed.
- The Python server and client examples used invalid or misleading compression level options, including `grpc.default_compression_level` with a gzip enum value and a numeric level. Removed these options and used the documented `compression=grpc.Compression.Gzip` parameter.
- The Python small-response example used call-level compression replacement where message-level disabling is clearer and documented. Updated it to `context.disable_next_message_compression()`.
- The custom zstd compressor snippet had an unused `bytes` import, missing gRPC imports, and decoder pool logic that never returned decoders to the pool through the `encoding.Compressor` interface. Simplified decompression to return a new zstd reader and added the required imports.
- The monitoring interceptor claimed protobuf `ByteSize()` represented compressed bytes sent and read `grpc-encoding` from application metadata. Updated the example to record serialized response size before transport compression and added a note that exact wire-byte metrics require transport, proxy, or OpenTelemetry metrics.

## Review Notes
The post is technically relevant and useful after the corrections. Some snippets still use placeholder service and message types such as `pb.MyServiceClient` and `service_pb2.DataRequest`, so they require a matching `.proto` definition to run as-is. `grpc.SetSendCompressor` and `google.golang.org/grpc/encoding` are marked experimental in gRPC-Go documentation, but they are the current non-deprecated mechanisms for this topic.

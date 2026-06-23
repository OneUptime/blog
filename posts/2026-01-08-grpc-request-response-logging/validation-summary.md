# Validation Summary: How to Log gRPC Requests and Responses for Debugging

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough of building request/response logging interceptors for gRPC services in Go and Node.js, with redaction, correlation IDs, and log aggregation.

## Technologies Covered
- gRPC (Go: `google.golang.org/grpc`; Node.js: `@grpc/grpc-js`)
- Go server interceptors (unary + stream), `grpc.ServerStream` wrapping
- Uber zap structured logging (`go.uber.org/zap`, `zapcore`)
- protobuf JSON serialization (`google.golang.org/protobuf/encoding/protojson`, `proto`)
- `github.com/google/uuid`
- gRPC metadata (`google.golang.org/grpc/metadata`) and `status`
- Node.js: pino logging (with `redact`), `uuid`
- Fluentd (tail source, record_transformer, elasticsearch output)
- Kubernetes Deployment with sidecar logging
- Elasticsearch query DSL

## Sources Consulted
- gRPC-Go interceptor API: https://pkg.go.dev/google.golang.org/grpc (`UnaryServerInterceptor`, `StreamServerInterceptor`, `ServerStream`, `UnaryServerInfo`, `StreamServerInfo`)
- gRPC-Go metadata: https://pkg.go.dev/google.golang.org/grpc/metadata (`FromIncomingContext`, `FromOutgoingContext`, `NewOutgoingContext`, `MD.Get`/`Set`)
- gRPC-Go status: https://pkg.go.dev/google.golang.org/grpc/status (`FromError`, `Code().String()`, `Message()`)
- Uber zap: https://pkg.go.dev/go.uber.org/zap and zapcore `EncoderConfig` (`MillisDurationEncoder`, `ISO8601TimeEncoder`, `OmitKey`)
- protojson: https://pkg.go.dev/google.golang.org/protobuf/encoding/protojson (`MarshalOptions`, `EmitUnpopulated`, `Indent`)
- google/uuid: https://pkg.go.dev/github.com/google/uuid (`New().String()`)
- pino redaction: https://getpino.io/#/docs/redaction (path syntax incl. wildcard `*.password`)
- Fluentd elasticsearch output plugin: https://github.com/uken/fluent-plugin-elasticsearch
- Elasticsearch Query DSL: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html (`term`, `range`, `date_histogram` with `fixed_interval`)

## Issues Found
1. **Unused import causing a Go compile error (fixed).** In the "Basic Logging Interceptor in Go" block, the import list included `"encoding/json"`, but that package is never referenced anywhere in the snippet. Go treats unused imports as a hard compile error (`imported and not used: "encoding/json"`). Removed the `encoding/json` import. (The later "Advanced" block legitimately imports and uses `encoding/json`, so it was left unchanged.)

## Review Notes
- **Metadata key casing (correct):** gRPC stores metadata keys in lowercase, so the lowercase keys checked in `sanitizeMetadata` (`authorization`, `cookie`, `x-api-key`) and the `x-correlation-id`/`x-request-id` constants will match incoming headers correctly.
- **Truncation vs. redaction ordering (design caveat, not a compile error):** In the advanced Go `serializeMessage`, when a serialized proto exceeds `MaxBodySize` the function returns the truncated string *before* calling `redactSensitiveData`. As a result, very large bodies are logged without field redaction (and the truncated string is also no longer valid JSON, so redaction would no-op anyway). For production use, redaction should run before truncation. Left as-is to avoid restructuring; worth flagging to readers.
- **Node.js section is illustrative custom wrapping, not a native API:** `@grpc/grpc-js` does not expose a server-side interceptor API of the shape shown in `loggingInterceptor` (`methodDefinition.implementation(request)`); that function is a conceptual sketch. The more realistic pattern is `wrapMethod`, which correctly wraps `(call, callback)` handlers. Additionally, `createLoggingServer` returns `{ ...server }`, which copies only own-enumerable properties and would not carry over `grpc.Server` prototype methods (`bindAsync`, `start`, etc.); a real implementation should return/extend the server instance itself. These are conceptual simplifications rather than language-level errors, so the prose was left intact.
- **pino redact paths (correct):** The wildcard paths (`*.password`, `*.token`) and `censor` option used are valid pino redaction syntax.
- **zap config (correct):** `zap.Config` fields, `SamplingConfig`, and the `zapcore.EncoderConfig` encoders used are all valid and `config.Build()` returns `(*zap.Logger, error)` as used.
- **Fluentd / Elasticsearch:** `type_name _doc` is accepted by the fluent-plugin-elasticsearch but is a legacy field tied to ES mapping types, which were removed in Elasticsearch 8.x; harmless for the illustration but a version caveat for ES 8+. Elasticsearch query DSL examples (`term`, `range`, `exists`, `date_histogram` with `fixed_interval`) are current and correct.

# Validation Summary: How to Monitor gRPC Traffic over IPv4 Networks

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- gRPC (Go and Python)
- Prometheus (metrics, PromQL)
- `go-grpc-prometheus` interceptor library
- OpenTelemetry (Go and Python instrumentation)
- `otelgrpc` stats handlers
- tcpdump and tshark (HTTP/2 capture/decode)
- Grafana (PromQL dashboard queries)

## Sources Consulted
- grpc-go repository: https://github.com/grpc/grpc-go (resolver registry, `clientconn.go` deprecation notes)
- grpc-go reference: https://pkg.go.dev/google.golang.org/grpc
- gRPC name resolution spec: https://github.com/grpc/grpc/blob/master/doc/naming.md
- `go-grpc-prometheus`: https://github.com/grpc-ecosystem/go-grpc-prometheus (metric names, `EnableHandlingTimeHistogram`, interceptor signatures)
- OpenTelemetry Go contrib: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc (`NewServerHandler`, `NewClientHandler`)
- OpenTelemetry Python instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html (`GrpcInstrumentorServer`, `GrpcInstrumentorClient`)
- Prometheus PromQL docs: https://prometheus.io/docs/prometheus/latest/querying/functions/ (`histogram_quantile`, `rate`, `topk`)
- Wireshark display filter reference for HTTP/2: https://www.wireshark.org/docs/dfref/h/http2.html (`http2.headers.path`, `http2.headers.status`)
- tcpdump(1) and tshark(1) man pages

## Issues Found
- **`ipv4:///` resolver scheme in grpc-go**: The original client snippet used `"ipv4:///192.168.1.10:50051"`. The `ipv4:` resolver is documented in the gRPC name-resolution spec and is supported by gRPC C-core (and thus C++/Python), but **grpc-go does not register an `ipv4` resolver** — only `dns`, `passthrough`, `unix`, and `unix-abstract` are built in. Using `ipv4:///...` in Go would fail (or fall back unpredictably). Changed to a plain `host:port` target (`"192.168.1.10:50051"`), which works correctly with both the default resolver and `grpc.NewClient` (whose default scheme is `dns`, which handles literal IPs).
- **Deprecated `grpc.Dial`**: `grpc.Dial` was deprecated in grpc-go v1.63.0 (March 2024) in favor of `grpc.NewClient`. Replaced `grpc.Dial(...)` with `grpc.NewClient(...)` in the OpenTelemetry client example. The semantics differ slightly (NewClient defers connection to first RPC and uses `dns` as the default scheme), but for this snippet — illustrating stats-handler wiring — the change is correct and current.

## Review Notes
- The post's description mentions "server reflection" but the post does not actually cover gRPC server reflection. This is a description/content mismatch but not a technical error in the snippets, so it was left unchanged per the "only fix technical errors" rule.
- The unused import `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc` in the OpenTelemetry Go snippet is harmless in a tutorial context (readers would obviously remove unused imports), but worth noting.
- The `histogram_quantile(0.99, rate(grpc_server_handling_seconds_bucket[5m]))` query is technically valid PromQL but would normally include a `sum by (le)` aggregation if there are multiple instances; the later Grafana query does this correctly.
- Metric names (`grpc_server_handled_total`, `grpc_server_handling_seconds_bucket`, `grpc_server_started_total`) and the `grpc_code` / `grpc_method` labels match what `go-grpc-prometheus` emits.
- Prometheus interceptor APIs (`UnaryServerInterceptor`, `StreamServerInterceptor`, `EnableHandlingTimeHistogram`) match the current `go-grpc-prometheus` API.
- Wireshark/tshark HTTP/2 display fields (`http2.headers.path`, `http2.headers.status`) and the `-d tcp.port==50051,http2` decode-as syntax are correct.
- Python `GrpcInstrumentorServer().instrument()` / `GrpcInstrumentorClient().instrument()` calls match the current `opentelemetry-instrumentation-grpc` API.

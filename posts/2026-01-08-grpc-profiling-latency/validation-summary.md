# Validation Summary: How to Profile gRPC Services for Latency Issues

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- gRPC (grpc-go, grpc Python)
- Go pprof (CPU, heap, mutex, block profiling)
- Prometheus client (histograms / promauto)
- Protocol Buffers (protobuf-go, protoreflect)
- OpenTelemetry (OTLP exporter, otelgrpc instrumentation)
- Jaeger (tracing backend / OTLP receiver)
- Python (cProfile, tracemalloc, gRPC server interceptor)
- ghz, tcpdump, tshark (load testing / network capture)
- Docker Compose (Grafana, Prometheus, Jaeger, Pyroscope)

## Sources Consulted
- Go pprof docs — https://pkg.go.dev/net/http/pprof and https://pkg.go.dev/runtime/pprof
- grpc-go docs — https://pkg.go.dev/google.golang.org/grpc (WithInsecure deprecation since v1.34, Dial → NewClient since v1.63, credentials/insecure)
- grpc-go stats handler — https://pkg.go.dev/google.golang.org/grpc/stats
- OpenTelemetry-Go — Jaeger exporter deprecation/removal notice (https://pkg.go.dev/go.opentelemetry.io/otel/exporters/jaeger) and OTLP HTTP exporter (https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp)
- otelgrpc — https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc (NewServerHandler / NewClientHandler)
- Jaeger OTLP support — native OTLP receiver enabled by default since Jaeger v1.35 (ports 4317/4318)
- protobuf-go reflection — https://pkg.go.dev/google.golang.org/protobuf/reflect/protoreflect
- Go language spec (no string * int operator) — https://go.dev/ref/spec
- Prometheus Go client — https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- gRPC performance best practices — https://grpc.io/docs/guides/performance/

## Issues Found
1. **Go string multiplication compile error** — In `PrintSizeAnalysis`, `fmt.Println("=" * 50)` was used. Go has no string-repeat operator (this is Python syntax) and would fail to compile. Changed to `fmt.Println(strings.Repeat("=", 50))` and added the `strings` import to that snippet.

2. **Removed OpenTelemetry Jaeger exporter** — The tracing setup used `go.opentelemetry.io/otel/exporters/jaeger` (`jaeger.New` / `jaeger.WithCollectorEndpoint`). That exporter was deprecated in 2023 and has been removed from OpenTelemetry-Go; Jaeger accepts OTLP natively. Replaced with the OTLP HTTP exporter (`otlptracehttp.New` pointing at `jaeger:4318`) and updated the import list accordingly.

3. **Broken/unused imports in the tracing snippet** — The same `import` block was missing `time` and `runtime` (both used by `ProfiledHandler`) and included an unused `go.opentelemetry.io/otel/trace` (an unused import is a compile error in Go). Added `time`/`runtime`, removed the unused `trace` import.

4. **Deprecated gRPC client APIs** — `NewTracedClient` used `grpc.Dial` with `grpc.WithInsecure()`. `WithInsecure()` has been deprecated since grpc-go v1.34 and `Dial` since v1.63. Updated to `grpc.NewClient` with `grpc.WithTransportCredentials(insecure.NewCredentials())` and added the `credentials/insecure` import.

5. **Invalid `internal/impl` import** — The message-optimization snippet contained `import "google.golang.org/protobuf/internal/impl"` with a comment about "arena allocation." That package is internal (cannot be imported from outside the protobuf module), is unused, and has nothing to do with arenas — the snippet actually demonstrates `sync.Pool`. Removed the bogus import and reworded the comment to describe the `sync.Pool` reuse pattern.

6. **docker-compose Jaeger ports** — Updated the Jaeger service to expose the OTLP receiver ports (`4317`/`4318`) used by the corrected exporter, replacing the legacy Jaeger-Thrift collector port (`14268`) which is no longer used by the example.

## Review Notes
- The `grpcpool.NewPool(grpcpool.PoolConfig{...})` snippet under "Connection Optimization" is illustrative pseudo-code; there is no single canonical gRPC pool package with that exact API (e.g., `processout/grpc-go-pool` uses a factory-function signature). Left as-is since it is clearly conceptual and not tied to a named import.
- `grpc.UseCompressor("identity")` is conceptually fine (identity = no compression) but `"identity"` is special-cased rather than a registered compressor; the example's intent (only compress large messages) is correct. Left unchanged.
- The `pyroscope/pyroscope:latest` image with the `server` command reflects the pre-Grafana Pyroscope; current Pyroscope is distributed as `grafana/pyroscope`. The legacy image still exists, so this is a soft deprecation worth noting rather than a hard error.
- `version: '3.8'` in docker-compose is now optional/obsolete under Compose v2 but does not cause errors; left unchanged.
- Several Go snippets are intentional fragments (e.g., referencing `networkLatency`, `createLargeMessage`, `io`, `sync` without full imports). These are standard for blog illustration and were not treated as errors beyond the compile-breaking cases fixed above.
- The latency-category percentages and the mermaid diagram are reasonable, non-authoritative illustrations and are technically sound as rough guidance.

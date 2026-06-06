# Validation Summary: How to Build Microservices with Go-Kit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (Golang)
- Go-Kit (github.com/go-kit/kit) — endpoint, transport/http, transport/grpc, log, metrics, sd/consul, sd/lb, circuitbreaker
- gRPC (google.golang.org/grpc) and Protocol Buffers
- gorilla/mux HTTP router
- Prometheus (client_golang) for metrics
- HashiCorp Consul (consul/api) for service discovery
- golang.org/x/time/rate token bucket rate limiter
- OpenTelemetry (go.opentelemetry.io/otel) for tracing
- sony/gobreaker circuit breaker

## Sources Consulted
- Go-Kit official docs and source: https://gokit.io/ and https://pkg.go.dev/github.com/go-kit/kit
- go-kit endpoint package: https://pkg.go.dev/github.com/go-kit/kit/endpoint
- go-kit transport/http: https://pkg.go.dev/github.com/go-kit/kit/transport/http
- go-kit transport/grpc: https://pkg.go.dev/github.com/go-kit/kit/transport/grpc
- go-kit sd/consul: https://pkg.go.dev/github.com/go-kit/kit/sd/consul
- go-kit sd/lb: https://pkg.go.dev/github.com/go-kit/kit/sd/lb
- golang.org/x/time/rate: https://pkg.go.dev/golang.org/x/time/rate
- gorilla/mux: https://pkg.go.dev/github.com/gorilla/mux
- HashiCorp Consul API: https://pkg.go.dev/github.com/hashicorp/consul/api
- Prometheus client_golang: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Go language spec on unused imports/variables: https://go.dev/ref/spec

## Issues Found

1. **`transport_http.go` — missing `fmt` and `log` imports.** The file uses `fmt.Sscanf` (in `decodeListUsersRequest`) and `log.Logger` (parameter type on `NewHTTPHandler`), but neither package was imported. Without these the file would not compile. Added `"fmt"` and `"github.com/go-kit/kit/log"` to the import block.

2. **`transport_grpc.go` — unused `codes` and `status` imports.** The imports `google.golang.org/grpc/codes` and `google.golang.org/grpc/status` were listed but never referenced in the code. Go treats unused imports as compile errors. Removed both.

3. **`middleware_ratelimit.go` — unused `ratelimit` import.** The file imported `github.com/go-kit/kit/ratelimit` but never used it (the code uses `golang.org/x/time/rate` directly). Removed the unused import.

4. **`PerClientRateLimiter` — concurrency bug.** The `limiters` map was being read and written from `GetLimiter` without synchronization, which is a data race when called from multiple goroutines (which is the normal case for an HTTP/gRPC server). Added a `sync.Mutex` field and locked it around the map access. Also added `"sync"` to the imports.

5. **`errors.go` — missing `context` and `encoding/json` imports.** The function `encodeHTTPErrorWithStatus` takes a `context.Context` and calls `json.NewEncoder`, but only `net/http` was imported. Added `"context"` and `"encoding/json"`.

6. **`discovery.go` — unused `io` import and missing `fmt` import.** `io` was imported but never used (compile error). The Consul health-check `HTTP` field uses `fmt.Sprintf`, but `fmt` was not imported. Replaced `"io"` with `"fmt"`.

7. **`main.go` — unused `context` import and unused `requestErrors` variable.** `context` was in the import list but never used in `main()`. Also `requestErrors` was created via `prometheus.NewCounterFrom` but never wired into any middleware (since `NewMetricsService` only takes `requestCount` and `requestLatency`). Both would fail to compile. Removed the unused `context` import and the unused `requestErrors` declaration. (Wiring it via `InstrumentingMiddleware` was considered but rejected because that would double-count `requestCount` and `requestLatency` which are already incremented at the service layer.)

## Review Notes

- **Go-Kit `kit` repository status.** The `github.com/go-kit/kit` import path used throughout the post is still the correct and canonical one. The maintainers have a newer `github.com/go-kit/log` standalone module for just the logger, but the embedded `github.com/go-kit/kit/log` package shown in the post still works and is what most existing Go-Kit code uses. This was left as-is to match common practice; readers starting greenfield projects today may prefer the standalone `go-kit/log` module.
- **`pb.UnimplementedUserServiceServer` embedding.** Correctly used in `transport_grpc.go` — this is the modern gRPC-Go recommended pattern for forward compatibility (since protoc-gen-go-grpc requires it by default).
- **Prometheus histogram buckets.** The buckets `{0.001, 0.01, 0.1, 0.5, 1, 5}` (seconds) are reasonable defaults for a request-latency histogram on a service expected to respond in low-millisecond to low-second range.
- **Email regex.** The post itself flags the regex as a "simple validation pattern" and recommends a more robust library for production — appropriate hedging, no change needed.
- **`http.ListenAndServe` in section 14.** Using `http.ListenAndServe` directly does not give you graceful shutdown — the post addresses this in section 16 with a separate `http.Server` example, which is a reasonable progression.
- **`level.Error(logger).Log("exit", <-errs)` at the end of `main()`.** Functionally fine, but in real production code one would also shut down the gRPC server and HTTP server cleanly here. The post covers this pattern in the Production Considerations section, so the introductory `main` keeps it terse.
- **`OpenTracing` vs `OpenTelemetry`.** The "Why Go-Kit?" table mentions both. Go-Kit's tracing helpers were originally OpenTracing-based; OpenTelemetry support exists via the broader Go ecosystem (the post's later `TracingMiddleware` example uses OTel directly, which is the right contemporary approach). No correction required.

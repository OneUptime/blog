# Validation Summary: How to Implement Custom Metrics for gRPC Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC (Go)
- Prometheus (`github.com/prometheus/client_golang`)
- Go (`promauto`, `prometheus` registry, histograms/gauges/counters)
- `google.golang.org/protobuf/proto` (message sizing)
- `google.golang.org/grpc/status` and `codes` (status codes)
- PromQL (queries section)

## Sources Consulted
- Prometheus client_golang docs: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- `promauto` package: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- `ExponentialBuckets` semantics: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#ExponentialBuckets
- gRPC-Go `codes` package (`Code.String()` values): https://pkg.go.dev/google.golang.org/grpc/codes
- gRPC-Go `status` package (`FromError`, nil-safe `Status.Code()`): https://pkg.go.dev/google.golang.org/grpc/status
- `proto.Size`: https://pkg.go.dev/google.golang.org/protobuf/proto#Size
- gRPC-Go interceptor types (`UnaryServerInterceptor`, `StreamServerInterceptor`): https://pkg.go.dev/google.golang.org/grpc

## Issues Found
1. **Incorrect gRPC status code string in `categorizeError`** (interceptor section). The switch matched `case "DeadlineExceeded", "Cancelled"`. gRPC-Go's `codes.Code.String()` returns the American spelling `"Canceled"` (one `l`) for `codes.Canceled`, so the `"Cancelled"` case would never match and cancelled requests would fall through to the `"internal"` default. Fixed to `"Canceled"`.
2. **Inaccurate bucket-range comment.** `prometheus.ExponentialBuckets(100, 2, 10)` produces buckets `100, 200, ... 100×2⁹ = 51200` bytes (≈50KB), but the inline comment claimed `// 100B to ~100KB`. Corrected the comment to `// 100B to ~50KB`.

## Review Notes
- The `SafeLabels` allowlist uses a lowercase application-defined `"cancelled"` status value, which is a custom label (not a gRPC code string), so it is correct as written and was left unchanged.
- The `OrderService.GetOrder` example references `s.cache`, which is not declared in the `OrderService` struct shown earlier. This is illustrative/partial example code (the struct only lists `metrics` and `repo`); it would not compile as-is but is clearly a snippet demonstrating cache-hit/miss metrics, not a complete program. Left as-is since it does not misrepresent any API behavior.
- `status.FromError(nil)` returning a nil `*Status` is handled safely because `(*Status).Code()` is nil-safe and returns `codes.OK`; the interceptor usage is correct.
- Prometheus naming, `promauto.With(reg)`, `NewCounterVec`/`NewGaugeVec`/`NewHistogramVec`, `proto.Size`, and PromQL `histogram_quantile`/`rate` usage are all current and correct.

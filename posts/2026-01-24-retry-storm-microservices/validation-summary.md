# Validation Summary: How to Fix 'Retry Storm' Issues in Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- net/http
- Prometheus client_golang
- PromQL
- Prometheus alerting rules
- Kubernetes ConfigMaps
- Microservice resilience patterns: retries, exponential backoff, jitter, circuit breakers, retry budgets, request hedging, and load shedding

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go math/rand package documentation: https://pkg.go.dev/math/rand
- Prometheus Go client promauto documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- AWS Builders' Library, "Timeouts, retries, and backoff with jitter": https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- AWS Architecture Blog, "Exponential Backoff And Jitter": https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Google SRE Book, "Handling Overload": https://sre.google/sre-book/handling-overload/
- Google SRE Book, "Addressing Cascading Failures": https://sre.google/sre-book/addressing-cascading-failures/
- gRPC request hedging documentation: https://grpc.io/docs/guides/request-hedging/

## Issues Found
- The monitoring Go snippet used placeholder `HTTPClient`, `Request`, and `Response` types and assigned `start := time.Now()` without using it. I changed the snippet to use `*http.Client`, `*http.Request`, and `*http.Response`, and removed the unused `context` and `time` imports.
- The circuit breaker half-open implementation claimed to allow limited requests but allowed unlimited concurrent half-open calls. I added an explicit `halfOpenInFlight` flag so only one probe is allowed at a time.
- The request hedging implementation could block forever when all attempts failed after the hedge limit was reached. I changed it to track attempts and results and return the last error once all attempts have failed.
- The load shedding middleware used `http.Handler`, `http.ResponseWriter`, `http.Request`, `http.Error`, and `http.StatusServiceUnavailable` without importing `net/http`. I added the missing import.
- The Prometheus alert for an open circuit breaker checked `circuit_breaker_state == 2`, but the Go enum defines `StateOpen` as `1` and `StateHalfOpen` as `2`. I changed the alert expression to `circuit_breaker_state == 1`.

## Review Notes
Go is not installed in this environment, so I could not run `go test` or `gofmt`. The remaining examples are illustrative and generally correct, but production implementations should also bound retry budgets per client or service, avoid hedging non-idempotent operations, and ensure high-cardinality labels such as raw URL paths are normalized before use in Prometheus metrics.

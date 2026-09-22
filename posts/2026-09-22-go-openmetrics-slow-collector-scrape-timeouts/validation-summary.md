# Validation Summary: How to Stop Slow Go OpenMetrics Collectors from Accumulating After Scrape Timeouts

## Status
validated

## Post Type
Technical troubleshooting guide with a runnable Go exporter example.

## Technologies Covered
- Go 1.25+, contexts, HTTP clients and servers, and JSON decoding
- Prometheus client_golang v1.24.1 and custom collectors
- promhttp gather coalescing, request admission limits, and timeouts
- OpenMetrics 1.0 content negotiation and exposition

## Sources Consulted
- [Pinned promhttp implementation and option contracts](https://github.com/prometheus/client_golang/blob/v1.24.1/prometheus/promhttp/http.go)
- [Pinned promhttp API documentation](https://pkg.go.dev/github.com/prometheus/client_golang@v1.24.1/prometheus/promhttp)
- [Prometheus collector and metric APIs](https://pkg.go.dev/github.com/prometheus/client_golang@v1.24.1/prometheus)
- [client_golang v1.24.1 module requirements](https://raw.githubusercontent.com/prometheus/client_golang/v1.24.1/go.mod)
- [Go module commands and dependency resolution](https://go.dev/ref/mod#go-get)
- [Go HTTP client, request context, and server contracts](https://pkg.go.dev/net/http)
- [Go context.WithTimeout](https://pkg.go.dev/context#WithTimeout)
- [Go io.LimitReader](https://pkg.go.dev/io#LimitReader)
- [Go JSON decoding](https://pkg.go.dev/encoding/json#Unmarshal)
- [Prometheus scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/)
- [Author profile link](https://github.com/nawazdhandala)

## Issues Found
1. **Incomplete dependency setup.** The original module-root `go get github.com/prometheus/client_golang@v1.24.1` succeeded, but a subsequent build of the example failed with missing transitive dependency checksum entries. Changed it to `go get github.com/prometheus/client_golang/prometheus/promhttp@v1.24.1`, which resolves the imported package's dependencies. Repeated the corrected commands in a fresh temporary module and successfully built the unmodified Go example.
2. **Overly broad transactional mutation restriction.** The original wording excluded any transactional gatherer that modifies shared metric families in place. Qualified the restriction to mutations after `Gather` returns and before `done` is called. Transactional reuse after release is allowed by the API contract.

## Review Notes
- Verified that v1.24.1 requires Go 1.25.0 and includes experimental `CoalesceGather`. No deprecated APIs were identified in the example.
- Confirmed that handler timeouts do not cancel collection, request slots remain held by unfinished inner handlers, and coalescing state belongs to each constructed handler. Shared results can remain available while existing handlers consume them; there is no configured cache TTL.
- Built and tested the extracted example using Go 1.25.3 on macOS arm64, with client_golang pinned to v1.24.1. Temporary tests were kept outside the repository.
- A successful test scrape returned HTTP 200, the queue-depth gauge, and the OpenMetrics `# EOF` terminator.
- A source that sent headers but stalled its response body produced a scrape error (HTTP 500) at approximately 1.5 seconds, verifying that the source deadline covers body reads.
- Four concurrent scrapes with a 200 ms handler timeout returned HTTP 503 and shared exactly one active source call. A subsequent request was rejected by the admission limit while the source call continued. After the source deadline, active source work drained and a later scrape started a new source call, confirming slot recovery.
- Context cancellation bounds the exporter's HTTP operation; remote source work must independently cooperate with cancellation to stop its own processing. A permanently stuck non-cancellable collector still requires the isolation approach described in the post.
- The cited technical links resolve to the relevant official resources. The author profile link also resolves. No long-duration goroutine stress benchmark was performed; the tests directly checked source-call counts, draining, and admission recovery.

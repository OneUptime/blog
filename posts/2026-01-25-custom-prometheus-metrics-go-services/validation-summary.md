# Validation Summary: How to Export Custom Prometheus Metrics from Go Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Prometheus
- prometheus/client_golang
- promhttp
- promauto
- Go net/http

## Sources Consulted
- Prometheus official guide: Instrumenting a Go application for Prometheus - https://prometheus.io/docs/guides/go-application/
- Prometheus Go client API documentation - https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus promauto API documentation - https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- Prometheus promhttp API documentation - https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Prometheus metric and label naming best practices - https://prometheus.io/docs/practices/naming/
- Prometheus instrumentation best practices - https://prometheus.io/docs/practices/instrumentation/
- Prometheus histograms and summaries best practices - https://prometheus.io/docs/practices/histograms/
- Go net/http package documentation - https://pkg.go.dev/net/http

## Issues Found
- The installation commands omitted `github.com/prometheus/client_golang/prometheus/promauto`, even though later examples use `promauto.NewCounterVec`, `promauto.NewGaugeVec`, and `promauto.NewHistogramVec`. Added the missing `go get` command to match the official Prometheus Go guide.
- HTTP metric examples used raw `r.URL.Path` as an endpoint label. Raw paths can include unbounded IDs and create high-cardinality metrics. Updated examples to use a route label based on `r.Pattern`, with an `unknown` fallback, and added a short note recommending route templates or handler names.
- The HTTP request counter used an `endpoint` label while the duration histogram used `endpoint` as well; after correcting path handling, both were changed consistently to `route`.
- The label pre-initialization example called `HTTPRequestsTotal.WithLabelValues(method, status)` even though the counter has three labels. Updated it to initialize method, route, and status values.
- The timer comment incorrectly implied `prometheus.NewTimer` returns a function. Updated the comment to explain that `ObserveDuration` records the elapsed time.
- The custom collector example defined and described a `db_queries_total` metric but never collected it, and the registration snippet referenced an undefined package-level `db`. Removed the unused query descriptor and changed registration to `RegisterDatabaseCollector(db *sql.DB)`.

## Review Notes
The post is technically relevant and now aligns with current Prometheus Go client usage. The examples are still illustrative snippets rather than complete standalone programs; imports such as `time`, `strconv`, and `database/sql` are implied by the focused snippets.

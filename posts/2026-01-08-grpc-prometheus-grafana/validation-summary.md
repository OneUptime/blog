# Validation Summary: How to Monitor gRPC Services with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC (Go)
- `github.com/grpc-ecosystem/go-grpc-prometheus` middleware
- `github.com/prometheus/client_golang` (registry, collectors, promhttp)
- Prometheus (scrape config, recording rules, alerting rules, PromQL)
- Grafana (dashboard JSON model)
- Kubernetes (Deployments, Services, ConfigMaps, service discovery via `kubernetes_sd_configs`)
- SLI/SLO and error-budget / burn-rate alerting concepts

## Sources Consulted
- go-grpc-prometheus README and API: https://github.com/grpc-ecosystem/go-grpc-prometheus (NewServerMetrics, InitializeMetrics, EnableHandlingTimeHistogram, WithHistogramBuckets, NewClientMetrics, EnableClientHandlingTimeHistogram, Unary/Stream interceptors; emitted metric names and labels)
- prometheus/client_golang docs: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus (NewRegistry, collectors.NewGoCollector, collectors.NewProcessCollector, promhttp.HandlerFor)
- grpc-go API: https://pkg.go.dev/google.golang.org/grpc (grpc.NewClient, grpc.NewServer, interceptor options, credentials/insecure)
- Prometheus docs: configuration, recording/alerting rules, querying/functions (histogram_quantile, rate, increase): https://prometheus.io/docs/
- Prometheus Kubernetes SD & relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Google SRE Workbook — Alerting on SLOs / multiwindow multi-burn-rate (14.4× burn-rate semantics): https://sre.google/workbook/alerting-on-slos/
- Grafana dashboard JSON model & panel docs: https://grafana.com/docs/grafana/latest/dashboards/
- Image tags verified plausible: prom/prometheus:v2.47.0, grafana/grafana:10.1.0

## Issues Found
1. **Incorrect burn-rate exhaustion time (alerting rules).** The `GRPCErrorBudgetBurnRate` alert description stated the error budget would be "exhausted in less than 2 hours." A 14.4× burn rate measured against a 30-day budget exhausts the budget in 30 ÷ 14.4 ≈ 2 days (this is the standard Google SRE fast-burn page, which consumes ~2% of the monthly budget per hour). The threshold expression `14.4 * (1 - 0.999)` is correct; only the description text was wrong. Changed it to "the 30-day error budget will be exhausted in about 2 days."
2. **Mislabeled recording-rule comment (SLI/SLO definitions).** The comment above `grpc:service:latency_p99:rate5m` read "Latency SLI: Percentage of requests under 100ms," but the rule computes `histogram_quantile(0.99, …)`, i.e. P99 latency in seconds — not a percentage. (The actual percentage-under-threshold SLI is the following `grpc:service:latency_sli:rate5m` rule.) Corrected the comment to "Latency SLI: P99 response latency."

## Review Notes
- **Library deprecation (non-blocking):** `github.com/grpc-ecosystem/go-grpc-prometheus` is in maintenance mode and the ecosystem now recommends the `providers/prometheus` package in go-grpc-middleware v2. The code as written is still valid and functional for the named library, and the emitted metric names (`grpc_server_handled_total`, `grpc_server_handling_seconds`, etc.) and labels (`grpc_service`, `grpc_method`, `grpc_code`, `grpc_type`) are correct, so this was left as-is. A future revision could mention the v2 alternative.
- All other Go code is syntactically correct and uses current, non-deprecated APIs (`grpc.NewClient` rather than the deprecated `grpc.Dial`; `collectors.NewGoCollector`/`NewProcessCollector`; `promhttp.HandlerFor`).
- All PromQL (rate/increase/histogram_quantile usage, `_bucket`/`_sum`/`_count` suffixes, `le` label handling) and Grafana panel JSON are correct.
- The "Active streams" query (`started_total - handled_total`) is a reasonable in-flight heuristic but counts all RPC types, not only streams — acceptable as an approximation and left unchanged.
- Prometheus scrape/relabel config, alert/recording-rule YAML structure, and Kubernetes manifests are valid. Image tags (prom/prometheus:v2.47.0, grafana/grafana:10.1.0) are real and version-appropriate for the post's timeframe.

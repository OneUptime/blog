# Validation Summary: How to Exclude Health Checks and Noisy Routes from Beyla

## Status
validated

## Post Type
Technical configuration guide

## Technologies Covered

- Grafana Beyla 3.33 and eBPF application instrumentation
- OpenTelemetry metrics, traces, semantic conventions, and Collector filtering
- Prometheus metrics, histogram counts, scraping, and staleness
- Grafana Tempo tracing and metrics generation from traces
- Kubernetes probes and Service DNS
- YAML configuration
- Bash and curl

## Sources Consulted

- Grafana Beyla routes decorator, including ignored patterns, wildcard matching, ignore modes, and unmatched handling: https://grafana.com/docs/beyla/latest/configure/routes-decorator/
- Grafana Beyla service discovery, exclusions, and per-service route-normalization rules: https://grafana.com/docs/beyla/latest/configure/service-discovery/
- Grafana Beyla source-side application and network attribute filters: https://grafana.com/docs/beyla/latest/configure/filter-metrics-traces/
- Grafana Beyla exported metric names, types, and default attributes: https://grafana.com/docs/beyla/latest/metrics/
- Grafana Beyla metric and trace attribute selection: https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/
- Grafana Beyla OTLP export interval and Prometheus exporter TTL: https://grafana.com/docs/beyla/latest/configure/export-data/
- Grafana Tempo metrics generated from retained traces: https://grafana.com/docs/tempo/latest/metrics-from-traces/
- OpenTelemetry Collector `span_metrics` connector: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry HTTP span and metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/ and https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector filtering with OTTL and resource attributes: https://opentelemetry.io/docs/collector/transforming-telemetry/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Service DNS troubleshooting: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes component metrics, including kubelet probe metrics: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus query staleness behavior: https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness
- curl command-line reference: https://curl.se/docs/manpage.html
- Grafana Beyla v3.33.0 configuration loading and validation source: https://github.com/grafana/beyla/blob/v3.33.0/pkg/beyla/config.go
- Grafana Beyla v3.33.0 route filtering implementation: https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/transform/routes.go
- Grafana Beyla v3.33.0 route matcher tokenization: https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/internal/transform/route/matcher.go

## Issues Found

- The `metrics` mode description did not make clear that it omits only matching application metrics emitted by Beyla. Clarified the SLO example and added that Tempo's metrics-generator or an OpenTelemetry Collector `span_metrics` connector can still derive RED metrics from retained spans.
- The post said `routes.ignored_patterns` could not affect database, Kafka, gRPC, or other non-HTTP application events. In standalone Beyla 3.33, the legacy top-level matcher checks every application event's internal path before the HTTP-type check, so a non-HTTP event with a matching path can also be suppressed. Corrected the protocol-boundary claim, retained the accurate network-flow distinction, and pointed to Beyla's source-side application and network filters for non-HTTP policies.
- The trailing-slash guidance implied that both `/health` and `/health/*` were needed. Beyla tokenization makes `/health` and `/health/` equivalent; `/health/*` alone also includes the base path and descendants. Updated the explanation and removed the redundant exact pattern from that example.
- The per-service discovery rules were described too generally, and the proposed downstream `service.name` plus `url.path` conjunction did not work for default Beyla metrics because `url.path` is hidden there. Identified the discovery rules as route-normalization rules and separated the span example (`service.name` plus `url.path`) from the metric example (`service.name` plus an available attribute such as `http.route`).
- The curl example assumed default in-cluster DNS without saying where it must run, and `|| true` unnecessarily masked its failure status. Added the in-cluster and configurable-domain context and removed `|| true` so request errors remain actionable.
- The validation steps incorrectly treated metric-series presence as proof that filtering failed. Existing Prometheus series can continue to be scraped with an unchanged value until Beyla's TTL expires. Changed the checks to compare the HTTP request-duration histogram count, added exporter/sampling and scrape/export timing assumptions, and scoped span checks to Beyla-produced spans.
- The statement that stale Prometheus series remain visible was too broad: historical samples remain queryable, but stale series disappear from later instant queries. Replaced it with accurate historical-query and Beyla TTL behavior.
- The post claimed a misspelled `ignore_mode` should fail validation. Standalone Beyla 3.33 accepts unknown keys and unrecognized mode values; an unsupported value can silently apply neither ignore flag. Replaced the claim with the three documented values and required functional verification.
- The incident-debugging advice suggested switching to `traces`, although that mode drops spans and retains metrics, and it implied that individual paths could select different modes in one top-level list. Corrected the signal directions, documented that one top-level `ignore_mode` applies to the entire `ignored_patterns` list, and limited separate-configuration advice to disjoint service groups.

## Review Notes

- The valid `all`, `traces`, and `metrics` semantics, wildcard behavior, query-string removal, `unmatched: low-cardinality`, discovery exclusions, and Kubernetes probe claims were verified against current official documentation and Beyla v3.33.0 source.
- Current Grafana documentation still presents `routes.ignored_patterns` and `ignore_mode` as supported. The v3.33.0 source marks the legacy v1 fields deprecated internally, so the existing recommendation to pin and retest a Beyla release remains important.
- All four links in the post's Official Documentation section resolve to the intended official pages. The Kubernetes link redirects to the current canonical probes page.
- The corrected YAML snippets and Bash loop are syntactically valid.

# Validation Summary: How to Send Dapr Metrics to Dynatrace

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar metrics, Configuration CRD, pod annotations)
- Dynatrace (Operator, DynaKube CRD, ActiveGate, Davis AI, DQL, Extensions Framework)
- Kubernetes (namespaces, annotations, deployments)
- Prometheus (metric scraping, metric format)

## Sources Consulted
- Dapr Configuration spec documentation (https://docs.dapr.io/reference/configuration-schema/)
- Dapr metrics documentation (https://docs.dapr.io/operations/observability/metrics/)
- Dynatrace Operator documentation (https://docs.dynatrace.com/docs/setup-and-configuration/setup-on-k8s/installation/dynakube)
- Dynatrace Prometheus metric ingestion (https://docs.dynatrace.com/docs/extend-dynatrace/extensions/extensions-concepts/data-sources/prometheus)
- Dynatrace annotation-based scraping (https://docs.dynatrace.com/docs/extend-dynatrace/extensions/extensions-concepts/data-sources/prometheus#annotated)
- Dynatrace DQL documentation (https://docs.dynatrace.com/docs/observe-and-explore/dashboards-and-notebooks/dynatrace-query-language)
- Cross-referenced with validated blog posts in this repo: `2026-03-31-rook-ceph-metrics-dynatrace` and `2026-02-24-how-to-export-istio-metrics-to-dynatrace`

## Issues Found

1. **Dapr Configuration CRD had invalid `port` field**: The `spec.metric.port: 9090` field does not exist in the Dapr Configuration resource. The metrics port is configured via pod annotations (`dapr.io/metrics-port`) or CLI flags, not the Configuration CRD. Removed the invalid field.

2. **Invalid ActiveGate capability `prometheus-scraper`**: The `prometheus-scraper` capability does not exist in the DynaKube CRD. Replaced with `metrics-ingest`, which is the correct capability for custom metric ingestion. Also added `extensions: prometheus: {}` to enable annotation-based Prometheus scraping (matching the pattern in the validated Rook Ceph Dynatrace post).

3. **Outdated Dynatrace Operator version and API**: The post referenced operator version `v0.15.0` with API version `dynatrace.com/v1beta1`, both of which are deprecated. Updated the install URL to use `latest` and the DynaKube API version to `dynatrace.com/v1beta6` (consistent with the validated Rook Ceph Dynatrace post).

4. **Non-existent `metrics.dynatrace.com/prefix` annotation**: The `metrics.dynatrace.com/prefix` annotation is not a standard Dynatrace annotation. The supported annotations are `scrape`, `port`, `path`, `secure`, and `filter`. Removed the invalid annotation.

5. **DQL query used wrong data source**: The third DQL example used `fetch bizevents` to query metric data. `bizevents` is for business events, not metrics. Replaced with a `timeseries` query, which is the correct DQL command for metric data.

## Review Notes
- The Dynatrace Extensions Framework YAML shown in the "Using the Dynatrace Extensions Framework" section is a simplified illustration. The actual Extensions 2.0 format has additional required fields and a more specific structure. This is acceptable for a conceptual overview but readers should consult official Dynatrace Extensions 2.0 documentation for production use.
- The Dapr metric names used (e.g., `dapr.http.server.request.count`, `dapr.resiliency.activations.total`) use Dynatrace dot-notation. The underlying Prometheus metrics from Dapr use underscores (e.g., `dapr_http_server_request_count`). Dynatrace automatically converts underscores to dots during ingestion, so this is correct in context.
- The Dashboard API call uses the Config v1 API (`/api/config/v1/dashboards`), which is functional but Dynatrace is migrating toward the newer Documents API for dashboard management. This is not an error but worth noting for future updates.

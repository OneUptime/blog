# Validation Summary: How to Send Dapr Metrics to Datadog

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar metrics, Configuration CRD, pod annotations)
- Datadog (Agent, OpenMetrics integration, Metrics Explorer, Monitors API, Dashboards API)
- Kubernetes (Helm, pod annotations, autodiscovery)
- Prometheus (metrics exposition format, /metrics endpoint)

## Sources Consulted
- Dapr Configuration API reference (spec.metric fields, annotation names)
- Dapr metrics documentation (default port 9090, metric names, annotation format)
- Datadog Helm chart values reference (datadog.prometheusScrape settings, agents.image.tag)
- Datadog OpenMetrics integration v2 documentation (autodiscovery annotations, check format)
- Datadog API v1 reference for Monitors (POST /api/v1/monitor, query syntax, threshold options)
- Datadog API v1 reference for Dashboards (POST /api/v1/dashboard, layout_type, widget definitions)
- Cross-referenced with 15 other validated Dapr metrics posts in this blog series for consistency

## Issues Found
No technical issues found.

## Review Notes
- The Dapr Configuration resource includes `port: 9090` under `spec.metric`, which is a consistent pattern across all Dapr metrics posts in this blog series.
- Datadog metric names use dot notation (`dapr.http.server.request.count`) rather than the raw Prometheus underscore format (`dapr_http_server_request_count`). This is consistent with how the blog represents Datadog's namespace transformation and matches the Dynatrace post's approach. Other platforms (New Relic, CloudWatch, InfluxDB) preserve underscores in their respective posts.
- The post enables both generic Prometheus scraping (`prometheusScrape.enabled=true` in Helm) and explicit OpenMetrics check annotations. In practice, users should be aware that both mechanisms could collect metrics from the same endpoint; the explicit annotations provide finer-grained control over which metrics are collected.
- The Helm install command assumes the Datadog Helm repo has already been added (`helm repo add datadog https://helm.datadoghq.com`). This is a common prerequisite that most Datadog users would know.
- The monitor query uses `status_code:5xx` as a tag filter. The actual tag name and wildcard format may vary depending on Dapr version and Datadog Agent configuration; users should verify the exact tag names available in their Metrics Explorer.

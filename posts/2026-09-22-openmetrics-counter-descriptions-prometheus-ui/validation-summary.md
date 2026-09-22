# Validation Summary: How to Diagnose Missing OpenMetrics Counter Descriptions in the Prometheus UI

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Prometheus 3.13.2, PromQL, scrape metadata APIs, and Explore Metrics.
- OpenMetrics text exposition 1.0.0 and Prometheus text exposition 0.0.4.
- Python and the prometheus_client library.
- HTTP content negotiation, curl, Remote Write, and OTLP.

## Sources Consulted
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/#counter-1
- Prometheus exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/
- Scrape protocol content negotiation: https://prometheus.io/docs/instrumenting/content_negotiation/
- Prometheus 3.13 configuration, including scrape_protocols and metric relabeling: https://prometheus.io/docs/prometheus/3.13/configuration/configuration/
- Python Counter API: https://prometheus.github.io/client_python/instrumenting/counter/
- Python client 0.25.0 OpenMetrics encoder implementation: https://raw.githubusercontent.com/prometheus/client_python/v0.25.0/prometheus_client/openmetrics/exposition.py
- Prometheus 3.13 target and metric metadata APIs: https://prometheus.io/docs/prometheus/3.13/querying/api/#querying-target-metadata
- Prometheus 3.13.2 release: https://github.com/prometheus/prometheus/releases/tag/v3.13.2
- Prometheus 3.13.2 scrape implementation: https://raw.githubusercontent.com/prometheus/prometheus/v3.13.2/scrape/scrape.go
- Prometheus jobs, instances, and up: https://prometheus.io/docs/concepts/jobs_instances/
- PromQL rate function: https://prometheus.io/docs/prometheus/3.13/querying/functions/#rate
- PromQL aggregation operators: https://prometheus.io/docs/prometheus/3.13/querying/operators/
- Official curl manual and local curl --help all: https://curl.se/docs/manpage.html

## Issues Found
- The opening capture instructions implied that explicitly requesting OpenMetrics captured the format Prometheus actually receives. A forced Accept header can negotiate a different representation from a real scrape. Clarified that the command tests OpenMetrics support and that reproducing the scrape requires the same target URL and Accept header, with protocol preferences controlled by scrape_protocols. Added the official negotiation reference. No code changes were necessary.

## Review Notes
- Ran the exact Python example with prometheus-client 0.25.0. It emitted HELP and TYPE under invoice_payments, a total sample of 42.0 under invoice_payments_total, an optional invoice_payments_created sample, and the EOF terminator.
- Started an isolated Prometheus 3.13.2 instance against a local endpoint serving the exact OpenMetrics payload. The target metadata API returned invoice_payments with type counter and the expected help string. The two PromQL selectors returned up=1 and invoice_payments_total=42. The temporary server and Prometheus process were stopped after verification.
- Checked all Bash snippets with bash -n and verified every curl flag against local help and official documentation. The example hostnames, ports, and billing job must correspond to the reader's deployment.
- Confirmed the intentional metadata naming difference between OpenMetrics 1.0 and Prometheus text 0.0.4, including the double _total consequence of giving an OpenMetrics counter family a name already ending in _total.
- Confirmed metadata API selectors, cross-target deduplication, and the documented Remote Write/OTLP exclusion from target metadata and Explore Metrics. The APIs are experimental; the article appropriately advises inspecting the deployed version.
- Confirmed that metric relabeling acts on samples before ingestion and that rate/sum expressions produce derived results rather than exported metric families. No claim that every UI handles these associations identically was introduced.
- The Prometheus 3.13.2 release and the article's technical documentation links resolve to the relevant official resources. The version-specific observation was reproduced rather than generalized to all releases.
- No deprecated API usage or additional technical errors were found. Browser rendering and proxy-specific behavior were not tested; the article presents these as deployment-dependent diagnostic possibilities.

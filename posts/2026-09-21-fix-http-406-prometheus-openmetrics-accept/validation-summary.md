# Validation Summary: How to Fix HTTP 406 Errors When Prometheus Requests application/openmetrics-text

## Status
validated

## Post Type
Technical troubleshooting guide with curl commands and Prometheus YAML configuration.

## Technologies Covered
- Prometheus scrape configuration and PromQL
- HTTP content negotiation, Accept, Content-Type, and HTTP 406
- OpenMetrics 1.0 and Prometheus text exposition 0.0.4
- Go Prometheus client and promhttp
- Python Prometheus client HTTP, WSGI, and ASGI integrations
- curl, web frameworks, and reverse proxies

## Sources Consulted
- [Prometheus scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/): protocol media types, version and escaping parameters, preference weights, wildcard ranges, and traditional-text fallback.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/): scrape_protocols, fallback_scrape_protocol, static_configs, and default HTTP /metrics scraping.
- [Prometheus scraper implementation](https://raw.githubusercontent.com/prometheus/prometheus/main/scrape/scrape.go): rejection of non-200 responses before processing the metrics payload.
- [Go promhttp API documentation](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp): HandlerFor and HandlerOpts.EnableOpenMetrics.
- [Python client HTTP integration](https://prometheus.github.io/client_python/exporting/http/), [WSGI integration](https://prometheus.github.io/client_python/exporting/http/wsgi/), and [ASGI integration](https://prometheus.github.io/client_python/exporting/http/asgi/): supported metrics-serving entry points.
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html): sections 12.4.2, 12.5.1, and 15.5.7 cover quality weights, media-range matching, and 406 responses.
- [curl command-line manual](https://curl.se/docs/manpage.html): silent/show-error, dump-header, header, and output options.
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): media type, version, and end-of-exposition marker requirements.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/): job labels and the generated up metric.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The troubleshooting sequence correctly separates HTTP representation rejection from metric parsing and payload termination errors.
- The mixed Accept example includes two valid alternatives with explicit quality weights. A supported lower-priority representation remains usable when the preferred representation is unsupported. Testing exclusions and wildcard specificity is appropriate for custom negotiation.
- The curl block passed bash -n. Its flags preserve response headers and bodies, including HTTP error bodies. Ordinary curl requests send a wildcard Accept header; the first example is therefore a permissive baseline, not an absent-Accept test.
- The YAML snippet parsed successfully with PyYAML, and its fields and protocol identifier match the official configuration schema. It targets HTTP /metrics on port 8000 using the documented defaults.
- The post appropriately makes scrape_protocols conditional on installed-version support and avoids claiming that restricting protocol preferences removes wildcard negotiation. Protocol format versions in the header are distinct from Prometheus server release versions.
- fallback_scrape_protocol addresses an unusable response Content-Type; it cannot bypass the scraper's rejection of HTTP 406. Timeout changes and adding an OpenMetrics EOF marker likewise do not correct that HTTP rejection.
- HandlerFor and EnableOpenMetrics remain documented APIs. The Python integrations are documented, and the linked HTTP page provides navigation to WSGI and ASGI documentation.
- The suggested framework and proxy failures are diagnostic possibilities, not guarantees about a particular product. Comparing direct and proxied requests and confirming attribution in logs is appropriate.
- Successful verification should show up equal to 1 for the intended target and the expected application metric. A matching Content-Type and complete payload remain necessary even after HTTP 406 disappears.
- Referenced technical documentation URLs resolved to the expected resources. No live exporter, gateway, or Prometheus deployment was supplied, so deployment-specific behavior was not tested; validation consists of official-source review and local syntax checks, not an end-to-end scrape or promtool run.

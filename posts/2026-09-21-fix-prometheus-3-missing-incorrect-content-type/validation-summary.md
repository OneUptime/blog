# Validation Summary: How to Fix Prometheus 3 Scrapes Rejected for a Missing or Incorrect Content-Type

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Prometheus 3 scrape protocols, job configuration, and promtool.
- HTTP Content-Type, Accept negotiation, redirects, and reverse proxies.
- Prometheus text exposition 0.0.4 and OpenMetrics 1.0.
- Python prometheus_client OpenMetrics encoder.
- curl, shell commands, and YAML.

## Sources Consulted
- [Prometheus 3 migration guide: scrape protocols](https://prometheus.io/docs/prometheus/latest/migration/#scrape-protocols) — changed handling of missing, unrecognized, and unparsable Content-Type headers.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — job-level fallback_scrape_protocol, supported protocol names, static targets, and reload behavior.
- [Prometheus 3.0.0 parser selection implementation](https://github.com/prometheus/prometheus/blob/v3.0.0/model/textparse/interface.go) — fallback selection versus recognized media types.
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/) — traditional text media type, encoding, metadata, and sample structure.
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) — media type, EOF marker, and counter family naming.
- [Prometheus scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/) — Accept parameters, protocol mappings, and escaping schemes.
- [Python client OpenMetrics exposition implementation](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/exposition.py) — generate_latest and matching CONTENT_TYPE_LATEST constant.
- [Python client HTTP exposition implementation](https://github.com/prometheus/client_python/blob/master/prometheus_client/exposition.py) — negotiated encoder and response content-type selection.
- [curl manual](https://curl.se/docs/manpage.html) — silent/show-error, location, fail-with-body, dump-header, header, output, and HEAD behavior.
- [promtool reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/) — configuration checking.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — up as the scrape health indicator.

## Issues Found
1. The curl command did not follow redirects, although the instructions required checking the final response after redirects. Added --location so the captured body comes from the final endpoint and the header file includes the redirect chain. The curl manual confirms that redirect following requires this option.

## Review Notes
- Confirmed the Prometheus 3 compatibility change and both fallback protocol names. The fallback is job-scoped and does not override a recognized media type or repair invalid samples and HTTP errors.
- Confirmed the sample headers and OpenMetrics EOF/counter metadata requirements. The Python fragment correctly pairs the OpenMetrics encoder with its matching constant and intentionally leaves framework response construction to the caller.
- Checked all technical reference links in the post; they resolve to the intended official documentation or upstream source.
- Validation performed: Python syntax parsing, shell syntax checking, YAML parsing, and a local HTTP redirect test using the corrected curl command. The local test verified that both redirect and final response headers were captured separately from the final metrics body.
- The Python client was not installed in the review environment, so its API and output behavior were checked against upstream source rather than executed. No live Prometheus scrape or promtool execution was performed; the configuration was checked against official documentation and the parser implementation.
- --fail-with-body requires curl 7.76.0 or newer. The example hostnames are placeholders and must be replaced for deployment.
- The sample Accept header requests the two formats discussed; it is not an exact reproduction of every Prometheus release's negotiated preferences. For endpoint-specific negotiation problems, match the deployed scraper's actual request headers and redirect settings.

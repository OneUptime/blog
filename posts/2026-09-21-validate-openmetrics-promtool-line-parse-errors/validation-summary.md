# Validation Summary: How to Validate OpenMetrics with promtool and Locate Line-Level Parse Errors

## Status
validated

## Post Type
Technical troubleshooting guide with Python code, Bash commands, and Prometheus YAML configuration.

## Technologies Covered
- Prometheus 3.13.2 and promtool
- OpenMetrics 1.0 and Prometheus text exposition 0.0.4
- Python and prometheus-client 0.26.0
- HTTP content negotiation and curl
- Bash, nl, and sed
- Prometheus scraping, PromQL, and container networking

## Sources Consulted
- Prometheus 3.13.2 promtool implementation: https://github.com/prometheus/prometheus/blob/v3.13.2/cmd/promtool/main.go
- Prometheus 3.13.2 dependency versions: https://github.com/prometheus/prometheus/blob/v3.13.2/go.mod
- Prometheus client_golang 1.23.2 linter implementation: https://github.com/prometheus/client_golang/blob/v1.23.2/prometheus/testutil/promlint/promlint.go
- Prometheus common 0.69.0 text parser: https://github.com/prometheus/common/blob/v0.69.0/expfmt/text_parse.go
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Python OpenMetrics parser 0.26.0: https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/openmetrics/parser.py
- Promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus server command reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus 3.13.2 configuration implementation: https://github.com/prometheus/prometheus/blob/v3.13.2/config/config.go
- Prometheus 3.13.2 scrape implementation: https://github.com/prometheus/prometheus/blob/v3.13.2/scrape/scrape.go
- Prometheus 3 migration guidance: https://prometheus.io/docs/prometheus/latest/migration/
- Prometheus jobs, instances, and up metric: https://prometheus.io/docs/concepts/jobs_instances/
- Python file opening and text I/O: https://docs.python.org/3/library/functions.html#open and https://docs.python.org/3/library/io.html#io.TextIOWrapper
- Curl command reference: https://curl.se/docs/manpage.html

## Issues Found
- **Misleading line number for invalid UTF-8.** The original Python example caught UnicodeDecodeError together with ValueError and reported every failure as occurring at or before the last yielded line. Python text I/O decodes buffered data ahead of iteration, so malformed bytes on a later line can fail before the first line is yielded. A fixture with an invalid byte on line 3 reproduced the incorrect “at or before line 0” message. Updated README.md to catch UnicodeDecodeError separately and explicitly report that the line is unavailable because decoding is buffered. Ordinary parser ValueError diagnostics retain the existing line tracking.

## Review Notes
- Confirmed the pinned source tags exist. Promtool 3.13.2 calls promlint.New; its pinned client_golang dependency selects the traditional text decoder. The underlying parser does not require an OpenMetrics EOF marker and does not support all OpenMetrics-specific TYPE values. The post correctly limits what successful linting establishes.
- Confirmed the Python parser API is present in prometheus-client 0.26.0. Installed that exact release in an isolated temporary virtual environment and executed the code extracted from the post.
- Runtime checks passed for a valid gauge family, missing EOF, unterminated label quotes, metadata after samples, and invalid UTF-8. Re-ran these checks after the correction. A duplicate gauge-series fixture was accepted, reinforcing the post's existing warning that diagnostic parsing is not comprehensive validation.
- Checked the EOF requirement, UTF-8 encoding, metadata ordering, family structure, histogram consistency rules, and content-type guidance against the OpenMetrics specification and parser implementation. For strict OpenMetrics 1.0 conformance, the response media type also includes charset=utf-8.
- Checked curl options, stdin redirection, version reporting, configuration validation, server flags, YAML field names, and the OpenMetricsText1.0.0 protocol identifier against official references. All Bash snippets passed bash -n syntax checks.
- The scrape_protocols setting controls negotiation preferences; it is not an assertion that a server returned the requested representation. The post's response-header inspection remains necessary. A successful scrape and expected samples establish ingestion success, not exhaustive specification conformance.
- Confirmed that Prometheus 3 rejects missing or unsupported response content types unless an appropriate fallback is configured. The up metric and same-host versus container-loopback guidance are accurate.
- Promtool and Prometheus executables were not installed in the review environment. CLI behavior and configuration were reviewed against official documentation and versioned source; a live Prometheus scrape and promtool execution were not performed.
- All technical reference links in the post resolved to the intended official documentation or versioned source. The post does not claim its pinned releases are the latest, and no version update was needed.

# Validation Summary: How to Migrate Prometheus Text 0.0.4 to OpenMetrics 1.0 Safely

## Status

validated

## Post Type

Technical migration guide with runnable Python instrumentation and Bash/curl examples.

## Technologies Covered

- Prometheus text exposition format 0.0.4
- OpenMetrics 1.0 text exposition
- Prometheus 3 scrape compatibility and label normalization
- Python and prometheus-client 0.26.0
- HTTP content negotiation, gzip compression, and cache variation
- Bash, pip, and curl
- Counters, gauges, classic histograms, and summaries

## Sources Consulted

- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): counter families, timestamps, EOF, units, exemplars, and histogram/summary encoding.
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/): legacy metadata, millisecond timestamps, and histogram/summary samples.
- [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/): normalization of histogram `le` and summary `quantile` labels starting in Prometheus 3.
- [Prometheus 3 migration guide](https://prometheus.io/docs/prometheus/latest/migration/): strict response content-type validation and fallback behavior.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/): supported scrape protocols and their preference order.
- [Prometheus scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/): Accept headers and protocol MIME types.
- [Python client HTTP exposition](https://prometheus.github.io/client_python/exporting/http/): HTTP server API and compression.
- [Python client counter documentation](https://prometheus.github.io/client_python/instrumenting/counter/) and [gauge documentation](https://prometheus.github.io/client_python/instrumenting/gauge/): construction and update APIs.
- [Python client v0.26.0 exposition implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py): encoder selection and legacy conversion. Also inspected the installed version's exposition and registry source.
- [prometheus-client 0.26.0 on PyPI](https://pypi.org/project/prometheus-client/0.26.0/): published release and Python requirement.
- [Python threading documentation](https://docs.python.org/3/library/threading.html#threading.Event): blocking Event behavior.
- [pip install documentation](https://pip.pypa.io/en/stable/cli/pip_install/): module invocation and pinned requirement syntax.
- Local `curl --help all`: verified `--fail`, `--silent`, `--show-error`, `-H`, `-D`, and `-o`.
- [RFC 9111, section 4.1](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.1): selecting cached responses based on request headers named by Vary.
- [Author's GitHub profile](https://github.com/nawazdhandala): verified the linked profile and redirect from the supplied www URL.

## Issues Found

No technical issues found.

The README required no changes during this review.

## Review Notes

- Installed the exact pinned package in an isolated virtual environment using Python 3.13.1. Version 0.26.0 is a published release and requires Python 3.9 or later. The example uses supported APIs.
- Extracted and ran the Python example unchanged on `127.0.0.1:8000`. Executed the post's Bash/curl capture block unchanged; both requests returned HTTP 200 and the expected content types.
- Parsed the legacy response with `prometheus_client.parser` and the OpenMetrics response with `prometheus_client.openmetrics.parser`. The resulting sample-name, label, and value mappings matched, including `api_requests_total{method="GET"}` at 12 and `api_workers` at 4.
- Confirmed the OpenMetrics response ends with `# EOF` and that legacy output uses counter metadata with the `_total` suffix. Both standalone text examples parsed successfully and represented the same counter sample.
- Repeated requests with no Accept header, wildcard Accept, explicit OpenMetrics 1.0 Accept, and a representative weighted multi-format Accept header. Tested each with and without gzip; all parsed results preserved the samples. The weighted header was constructed for this test, not captured from a running Prometheus instance.
- The default counter also emits an `api_requests_created` sample. In this example its value is preserved across representations, although its metadata grouping differs. The post correctly permits documented auxiliary-series differences when comparing implementations.
- The pinned client's negotiation is narrower than general HTTP content negotiation: its encoder selection does not fully implement quality-value ranking. The post's explicit headers work, and its recommendation to test actual consumer headers remains appropriate.
- Confirmed the distinction between seconds in OpenMetrics sample timestamps and milliseconds in legacy text, and the need to retain the ingested counter name while changing family metadata. The histogram and summary compatibility guidance agrees with the specifications and Prometheus 3 documentation.
- No Prometheus server, production proxy, dashboards, or alert rules were available for integration testing. Actual ingestion, deployment-boundary behavior, histogram/summary query compatibility, and cache configuration were reviewed against documentation rather than exercised in a production topology. The post explicitly requires these checks during rollout.
- All external links in the post resolved to the intended resources. No configuration snippets are present, and no deprecated APIs were identified in the example.

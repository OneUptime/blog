# Validation Summary: How to Convert a JSON API or Log-Derived Statistics into an OpenMetrics Exporter

## Status

validated

## Post Type

Tutorial with executable Python code, an installation command, and an HTTP verification command.

## Technologies Covered

- Python and its JSON, urllib, HTTP client, math, and threading APIs
- prometheus-client 0.26.0 and custom collectors
- Prometheus counters, gauges, labels, scrape health, and counter reset handling
- OpenMetrics 1.0 text exposition and HTTP content negotiation
- curl
- JSON API snapshots and log-derived cumulative statistics

## Sources Consulted

- Python client custom collectors: https://prometheus.github.io/client_python/collector/custom/
- Python client HTTP server: https://prometheus.github.io/client_python/exporting/http/
- Versioned client exposition implementation: https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py
- Package release and Python requirements: https://pypi.org/project/prometheus-client/0.26.0/
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus query functions, including rate and increase: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus exporter guidance: https://prometheus.io/docs/instrumenting/writing_exporters/
- Prometheus scrape health and up: https://prometheus.io/docs/concepts/jobs_instances/
- Python urllib request behavior and timeout: https://docs.python.org/3/library/urllib.request.html
- Python HTTP client exceptions: https://docs.python.org/3/library/http.client.html
- Python JSON decoding and type conversion: https://docs.python.org/3/library/json.html
- Python finite-number validation: https://docs.python.org/3/library/math.html#math.isfinite
- curl option reference: https://curl.se/docs/manpage.html
- Author link: https://github.com/nawazdhandala

## Issues Found

1. **Invalid source containers could report successful collection.** The original code iterated over `data["queues"]` without checking that it was an array. An empty JSON object or empty string therefore produced `queue_source_up 1` without queue samples, despite violating the source contract. Added a check that the root is an object and `queues` is an array. A valid empty array continues to represent missing queues as documented.
2. **Some HTTP protocol failures escaped the collection failure handler.** Exceptions such as `http.client.BadStatusLine` and `http.client.IncompleteRead` derive from `HTTPException` and are not covered by the original exception tuple. They could abort exposition instead of emitting `queue_source_up 0`. Added the `http.client` import and caught `HTTPException`. Reproduced the original uncaught exception, then verified the corrected handler with injected exceptions and a real interrupted chunked HTTP response.

Only the affected code was changed; the post structure and prose were preserved.

## Review Notes

- Installed the pinned package in an isolated virtual environment and executed the Python block extracted directly from the corrected README using Python 3.13.1. Version 0.26.0 exists and requires Python 3.9 or newer; the APIs used are supported.
- Completed 36 successful test scrapes against a real local source server and the client HTTP server, using the article's curl flags on temporary ports. Every scrape returned the OpenMetrics 1.0 content type, parsed successfully with the OpenMetrics parser, and ended with exactly one EOF marker.
- Tested identical cumulative totals, an increased total, a reset, duplicate queue rows, invalid numeric values in both measurements, malformed containers and rows, a malformed later row, invalid JSON and UTF-8, an oversized response, missing queues, an ignored unlisted queue, HTTP 503, an interrupted chunked response, recovery, and connection refusal. Failure cases exposed only the source failure gauge, without partial or cached business samples.
- Separately verified that collector registration does not fetch the source and that protocol exceptions become source failure metrics.
- Confirmed the counter sample suffix, snapshot semantics, bounded labels, counter-versus-gauge guidance, and reset handling with rate/increase. The log checkpoint guidance is sound design advice; the article does not implement a log reader or persistence layer to execute.
- The two-second urllib timeout correctly describes blocking operations rather than an end-to-end deadline. The suggested refresh worker and freshness metric are future design options, not implemented features of this example.
- The server binds to loopback as shown; remote scraping requires an intentional bind-address change. Scrape health and source health remain distinct.
- The referenced documentation URLs resolved to the intended resources. No deprecated API usage was found in the example.

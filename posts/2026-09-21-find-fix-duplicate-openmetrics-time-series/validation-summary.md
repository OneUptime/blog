# Validation Summary: How to Find and Fix Duplicate Time Series in an OpenMetrics Payload

## Status
validated

## Post Type
Technical troubleshooting guide with a Python diagnostic.

## Technologies Covered
- OpenMetrics text exposition and classic metric types
- Prometheus series identity, relabeling, and metric name escaping
- Python and prometheus-client 0.26.0
- Exporter registries, counters, and histogram aggregation

## Sources Consulted
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Prometheus data model, including empty-label equivalence: https://prometheus.io/docs/concepts/data_model/
- Pinned Python OpenMetrics parser source: https://raw.githubusercontent.com/prometheus/client_python/v0.26.0/prometheus_client/openmetrics/parser.py
- Python collector registry source: https://raw.githubusercontent.com/prometheus/client_python/v0.26.0/prometheus_client/registry.py
- Package release and requirements: https://pypi.org/project/prometheus-client/0.26.0/
- Prometheus escaping schemes: https://prometheus.io/docs/instrumenting/escaping_schemes/
- Prometheus scrape and relabeling configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- PromQL rate and reset handling: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Histogram and summary aggregation: https://prometheus.io/docs/practices/histograms/
- Python string line splitting: https://docs.python.org/3/library/stdtypes.html#str.splitlines
- Python StringIO: https://docs.python.org/3/library/io.html#io.StringIO
- Also checked the post's master-branch parser link and author profile; both resolve to the intended resources.

## Issues Found
1. **Valid label values could be split into false sample lines.** Python `str.splitlines()` recognizes separators beyond LF, including vertical tabs and U+2028, which can occur in OpenMetrics label values. Reproduced false rejection with both characters. Replaced it with `StringIO` iteration and removal of the terminating LF only.
2. **Empty-valued labels concealed ingestion collisions.** The original checker accepted `m 1` and `m{a=""} 2` as distinct series. Prometheus treats empty-valued labels as absent. Added that qualification to the identity explanation and excluded empty-valued labels from the canonical key. Confirmed the corrected checker rejects this collision.
3. **Parser acceptance could be mistaken for complete conformance validation.** The upstream parser explicitly describes itself as lax. Added a caveat that successful parsing does not prove specification conformance, while preserving the useful structure check and original-line duplicate pass.
4. **Producer-cause examples needed registry and framing qualifications.** Python's registry normally rejects known overlapping metric names during registration. Qualified duplicate registration to cover cases where names cannot be detected. Clarified that concatenating complete OpenMetrics responses independently violates EOF framing.
5. **The claim that payload changes cannot fix downstream collisions was absolute.** An additional source label can prevent a collision if it survives scrape transformations. Reworded the advice to prefer repairing scrape configuration while acknowledging that condition.

## Review Notes
- Installed the exact `prometheus-client==0.26.0` release in an isolated temporary virtual environment and executed the Python code extracted from the updated README.
- All 14 diagnostic fixtures passed their expected acceptance or rejection outcomes: distinct backends, reordered duplicate labels, identical duplicate samples, absent versus empty labels, Unicode line separators, vertical tabs, escaped quotes and commas, historical points rejected by the snapshot checker, translated-name collisions, an empty exposition, EOF without a trailing newline, missing EOF, duplicate TYPE metadata, and a valid classic histogram.
- Separately verified that the family parser accepts two increasing timestamped gauge points. Historical data needs the separate timestamp and compound-point grouping logic described in the post.
- Reproduced the family iterator coalescing two reordered-label gauge samples into one sample, confirming why inspecting original lines is necessary.
- The private `_parse_sample` helper exists and accepts the demonstrated argument in the pinned release. It remains an unsupported internal interface; retaining the explicit version pin and diagnostic-only scope is appropriate.
- The code is scoped to classic scalar sample lines, not native histogram text samples or a complete OpenMetrics conformance validator.
- Confirmed name-escaping collisions, labeldrop behavior, rate-before-aggregation guidance, metadata uniqueness, and classic histogram aggregation requirements against the sources above.
- There are no terminal command blocks or configuration snippets to execute. No running exporter or Prometheus instance was provided, so live scrape errors and stored series counts were not tested.

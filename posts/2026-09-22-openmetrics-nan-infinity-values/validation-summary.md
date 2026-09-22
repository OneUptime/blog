# Validation Summary: How to Encode `NaN`, `+Inf`, and `-Inf` Correctly in OpenMetrics Values

## Status
validated

## Post Type
Technical guide with Python serialization and OpenMetrics exposition examples.

## Technologies Covered
- OpenMetrics 1.0 text exposition
- Prometheus and PromQL
- Python float formatting, math, pathlib, and JSON
- Prometheus Python client OpenMetrics parser

## Sources Consulted
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): values, metric types, number and timestamp grammar, metadata, canonical numbers, and NaN semantics.
- [OpenMetrics 2.0 experimental specification](https://prometheus.io/docs/specs/om/open_metrics_spec_2_0/): version status and format changes.
- [Official Python client parser source](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py): parser API and component validation.
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/): floating-point arithmetic and non-finite values.
- [Python math documentation](https://docs.python.org/3/library/math.html): isnan and isinf.
- [Python built-in functions](https://docs.python.org/3/library/functions.html): float conversion and repr.
- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html#pathlib.Path.read_text): text decoding.
- [Python JSON documentation](https://docs.python.org/3/library/json.html#infinite-and-nan-number-values): non-finite number serialization.
- [Author profile](https://github.com/nawazdhandala): verified the author link resolves.

## Issues Found
1. The scope was implicit. Made OpenMetrics 1.0 explicit in the introduction because the linked normative specification and classic exposition examples target that version; the experimental 2.0 format differs.
2. The empty-window summary statement described NaN as optional. Changed it to require NaN for an exposed quantile when there are no observations in the relevant window, matching the specification.

## Review Notes
- Executed both Python code blocks using Python 3.9.6 and prometheus-client 0.25.0. All encoder assertions and the file-based parser example passed.
- Parsed both complete text fixtures and checked that the gauge values preserve NaN, positive infinity, and negative infinity.
- Confirmed full iterator consumption rejects five negative fixtures: NaN counter total, NaN timestamp, fractional bucket count, infinite bucket count, and missing EOF.
- Verified component restrictions, bucket-boundary versus bucket-count semantics, required EOF, UTF-8 decoding, and the distinction between missing observations and NaN.
- The recommended non-finite spellings are portable; the number grammar also accepts alternate case and infinity spellings. No change was needed to the encoder.
- The formatter intentionally converts to float and does not preserve arbitrary-precision integers or validate metric semantics, as the post states.
- The parser is an independent syntax and component check; source-failure policy and downstream monitoring behavior still require application-specific validation.
- All referenced links resolved to the intended resources. The parser link tracks master, so implementation details may change. No deprecated API or terminal command was present.

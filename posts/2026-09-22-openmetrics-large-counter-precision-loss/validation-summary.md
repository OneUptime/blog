# Validation Summary: How to Diagnose Precision Loss in Large OpenMetrics Counters

## Status
validated

## Post Type
Technical troubleshooting guide with executable Python demonstrations and PromQL examples.

## Technologies Covered
- OpenMetrics text exposition and counter semantics
- Prometheus scalar samples, HTTP API, and PromQL
- IEEE 754 binary64 floating-point arithmetic
- Python and prometheus-client 0.26.0
- Go prometheus/client_golang v1.24.1

## Sources Consulted
- [OpenMetrics 1.0 specification: values, numbers, and counters](https://prometheus.io/docs/specs/om/open_metrics_spec/)
- [Prometheus data model: samples](https://prometheus.io/docs/concepts/data_model/#samples)
- [Python floating-point arithmetic guide](https://docs.python.org/3/tutorial/floatingpoint.html)
- [Python math.ulp and math.nextafter documentation](https://docs.python.org/3/library/math.html#math.ulp)
- [Python client Counter documentation](https://prometheus.github.io/client_python/instrumenting/counter/)
- [Python client v0.26.0 value storage implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/values.py)
- [Python client v0.26.0 memory-mapped storage implementation](https://raw.githubusercontent.com/prometheus/client_python/v0.26.0/prometheus_client/mmap_dict.py)
- [Go client v1.24.1 counter implementation](https://github.com/prometheus/client_golang/blob/v1.24.1/prometheus/counter.go)
- [Prometheus rate and increase documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus HTTP API documentation](https://prometheus.io/docs/prometheus/latest/querying/api/#expression-queries)
- [Prometheus instrumentation guidance: labels and counters](https://prometheus.io/docs/practices/instrumentation/)
- [Author GitHub profile](https://github.com/nawazdhandala)

## Issues Found
- The statement that neighboring values are 256 units apart “at roughly 2**60” obscured the change in spacing at that boundary. Specified the interval from 2**60 up to 2**61 and noted the 128-unit spacing immediately below 2**60. Verified with Python's documented binary64 representation, math.ulp, and math.nextafter.
- The rate discussion compared its result with an integer event count, which could blur the distinction between rate and count. Clarified that rate returns an average per-second rate and that increase can return a non-integer estimate because of extrapolation, as documented by Prometheus.

## Review Notes
- Executed all three Python code blocks using Python 3.9.6, installing prometheus-client 0.26.0 in an isolated temporary virtual environment for the client example. Both arithmetic examples matched every expected output in their comments.
- The client example exported precision_events_total as 9.007199254740992e+15 after adding 2**53 and then one, confirming the lost increment. OpenMetrics output included the counter metadata and EOF marker.
- Verified the boundary separately: math.ulp(float(2**60)) is 256.0, while subtracting the preceding representable value obtained with math.nextafter gives 128.0.
- math.ulp requires Python 3.9 or newer. The examples use supported APIs; no deprecated API usage was identified.
- The Python storage source initializes single-process values as floats; the multiprocess path also accumulates floating-point values and persists doubles. Multiprocess behavior was reviewed in source, not exercised in a multi-worker deployment.
- The pinned Go implementation uses a uint64 contribution for Inc and suitable Add arguments, combines it with a floating-point contribution on export, and accepts Add arguments as float64. Its integer path is bounded by uint64 capacity. Go behavior was source-reviewed, not runtime-tested.
- Confirmed that OpenMetrics permits integer values without requiring ingestors to preserve integer precision, and that Prometheus ordinary samples use float64. The article correctly distinguishes those samples from other sample types.
- Reviewed the PromQL expressions against official documentation. Reset adjustment, extrapolation, bounded label use, and the limitations of longer query windows are consistent with the documented model. No live Prometheus server or dashboard was used.
- The cited version tags and source links resolve to the relevant implementations. They provide reproducible version-specific references rather than claiming to be the latest releases. The data-model page could not be fetched directly in this environment, but its official indexed content confirmed the sample representation.
- No terminal commands or configuration snippets occur in the post. Changes were limited to the two technical clarifications above; the article structure and code were preserved.

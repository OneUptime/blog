# Validation Summary: How to Limit OpenMetrics Exemplar Label Length and Cardinality in Prometheus

## Status

validated

## Post Type

Technical guide with Python examples, an OpenMetrics sample, and Prometheus YAML configuration.

## Technologies Covered

- Prometheus exemplar storage, configuration, series cardinality, and HTTP API
- OpenMetrics exemplar labels and histogram exposition
- Python strings and the prometheus-client OpenMetrics parser
- JavaScript Unicode string counting
- Distributed tracing and trace/span identifiers

## Sources Consulted

- [OpenMetrics 1.0 specification: exemplars and histogram/text exposition](https://prometheus.io/docs/specs/om/open_metrics_spec/#exemplars)
- [Prometheus exemplar model and length constant](https://github.com/prometheus/prometheus/blob/main/model/exemplar/exemplar.go), verified through the [raw official source](https://raw.githubusercontent.com/prometheus/prometheus/main/model/exemplar/exemplar.go)
- [Prometheus exemplar storage implementation](https://raw.githubusercontent.com/prometheus/prometheus/main/tsdb/exemplar.go)
- [Prometheus exemplar storage feature flag](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage)
- [Prometheus exemplar configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#exemplars)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus exemplar query API](https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars)
- [Official Python OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py)
- [Python string documentation](https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str)
- [ECMAScript string operations and iteration specification](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype-@@iterator)
- [W3C Trace Context specification](https://www.w3.org/TR/trace-context/#trace-id)

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. The cited technical resources correspond to the claims; the Prometheus model source was accessible through its raw GitHub URL when the GitHub page could not be fetched by the browsing tool.
- Executed both Python examples. The conventional trace/span label pair totals 63 code points, and the helper preserves the expected labels.
- Tested combined label budgets of 127, 128, and 129 with ASCII, accented characters, and supplementary-plane emoji. Both the helper and the installed prometheus-client 0.25.0 OpenMetrics parser accepted 127 and 128 and rejected 129. These synthetic inputs test length handling, not valid trace identifier syntax; the post correctly requires separate identifier validation.
- Parsed the displayed histogram sample after placing it in a complete histogram exposition with TYPE metadata, the required +Inf bucket, count/sum samples, and EOF. Its exemplar value parsed as 0.32. The post presents a sample line illustrating label placement, not an entire scrape payload.
- Executed a Node.js check confirming that an emoji occupies two UTF-16 code units but one element when counted with Array.from.
- Confirmed that Prometheus uses a 128-code-point limit and counts label names and values with utf8.RuneCountInString. Serialization punctuation is outside that budget.
- Confirmed the storage.exemplars.max_exemplars configuration and --enable-feature=exemplar-storage flag against official documentation. The shared buffer holds a number of exemplars across series; 100,000 divided by 1,000 accepted exemplars per second gives the stated approximate 100 seconds of coverage.
- Exemplar storage and the exemplar query API remain documented as experimental. The post does not claim a particular Prometheus release; latest documentation and upstream source were consulted.
- Trace identifiers in exemplar metadata do not change ordinary metric identity. Moving them into metric labels creates distinct series; histogram instrumentation multiplies those across its exported components.
- No live Prometheus server scrape, exemplar API request, intermediary pipeline test, or before/after series-count measurement was performed. Those deployment-specific checks remain sound recommendations in the post. Configuration was checked against the official schema rather than a running server.

# Validation Summary: How to Expose OpenMetrics StateSet Metrics Without Conflicting State Labels

## Status
validated

## Post Type
Technical guide with Python instrumentation examples, OpenMetrics exposition samples, and PromQL queries.

## Technologies Covered
- OpenMetrics StateSet exposition
- Python and the Prometheus Python client (`prometheus_client`)
- Prometheus and PromQL
- Monitoring, observability, metric labels, and time-series cardinality

## Sources Consulted
- OpenMetrics 1.0 specification, including StateSet data-model and text-format rules, unique label names, and missing data: https://prometheus.io/docs/specs/om/open_metrics_spec/#stateset
- Official Python client Enum documentation: https://prometheus.github.io/client_python/instrumenting/enum/
- Official Python client implementation, including Enum initialization, validation, locking, and sample generation: https://github.com/prometheus/client_python/blob/master/prometheus_client/metrics.py
- Official Python client multiprocess limitations: https://prometheus.github.io/client_python/multiprocess/
- Official PromQL operator documentation, including comparisons and aggregation with `without`: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Official Prometheus metric and label naming guidance: https://prometheus.io/docs/practices/naming/
- Author profile linked by the post: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post is technically relevant and contains executable implementation examples.
- Confirmed that StateSet samples have no type suffix, use the family name for the state label, and encode each state as zero or one. Ordinary entity labels must not conflict with that reserved dimension. Exactly one true state is required for enum semantics; general StateSets can represent several true states.
- Executed both Python code blocks using the installed `prometheus-client` 0.25.0. The Enum example produced the expected three samples, including inactive states, and the Boolean-vector example passed its assertions.
- Parsed both the generated output and the hand-written valid exposition using the Python client's OpenMetrics parser. Confirmed the metric type, sample count, decoded label names, and expected values.
- Exercised all nine ordered transitions among the three declared states. Every resulting exposition retained three samples and exactly one active state. Also verified rejection of an unsupported state, first-state initialization, two independently labeled entities, and removal of one entity from exposition.
- Verified that constructing the illustrated Enum with a conflicting family-name label raises ValueError, and that the parser rejects the deliberately invalid duplicate-label sample. That invalid example is intentional and needs no correction.
- Confirmed the documented multiprocess restriction and the implementation's locked state selection and sample generation. A custom collector still needs a coherent application-state snapshot.
- Reviewed both PromQL expressions against official syntax and semantics. Equality selects active running samples; aggregation excludes the state label while retaining identity labels, and inequality selects groups whose sum is not one. Queries were documentation-reviewed, not executed against a live Prometheus server.
- The sum check assumes Boolean inputs and does not prove that all declared inactive states are present. The post appropriately recommends separate completeness tests and inventory or availability checks for wholly missing entities.
- Confirmed the bounded-state cardinality guidance and checked that the referenced technical links resolve to the intended official resources. No terminal commands, configuration files, or deprecated APIs require correction.

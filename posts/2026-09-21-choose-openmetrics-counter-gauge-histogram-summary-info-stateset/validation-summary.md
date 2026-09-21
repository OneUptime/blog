# Validation Summary: How to Choose OpenMetrics Counter, Gauge, Histogram, Summary, Info, or StateSet

## Status
validated

## Post Type
Technical guide with OpenMetrics exposition examples and PromQL queries.

## Technologies Covered
- OpenMetrics 1.0 metric types and text exposition
- Prometheus and PromQL
- Classic and native histograms
- Prometheus Python client Summary implementation

## Sources Consulted
- OpenMetrics 1.0 specification, including metric semantics and text encoding: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Prometheus histogram and summary guidance: https://prometheus.io/docs/practices/histograms/
- PromQL functions, including rate, increase, and histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus native histogram specification and client support: https://prometheus.io/docs/specs/native_histograms/
- Python client Summary documentation: https://prometheus.github.io/client_python/instrumenting/summary/
- Prometheus instrumentation guidance on timestamps and label cardinality: https://prometheus.io/docs/practices/instrumentation/
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- The histogram description unconditionally stated that classic histograms expose count and sum. OpenMetrics 1.0 permits the sum to be absent and prohibits it when negative bucket thresholds are present. Qualified the statement and added that exception. This preserves the duration example while avoiding an incorrect general requirement.

## Review Notes
- Verified counter reset semantics, gauge examples, metadata lifecycle, and the distinction between independent boolean states and mutually exclusive enumeration values.
- Parsed all four text exposition blocks successfully using the official Python client's OpenMetrics parser (prometheus-client 0.26.0), installed in an isolated temporary virtual environment. The parser recognized the intended counter, gauge, info, and stateset families and all seven samples.
- Checked both PromQL expressions against official documented patterns. The counter query applies rate before aggregation; the classic histogram query retains le and calculates the percentile after combining bucket rates. These queries require the corresponding scraped series; they were not executed against a running Prometheus server.
- Confirmed that summary quantiles cannot generally be aggregated across instances and that the Python Summary does not compute quantiles. For an aggregate duration mean, sum per-series rates separately for the numerator and denominator before division. The post appropriately calls for a policy when there are no observations.
- Native histogram transport and client support depend on the deployed versions. The OpenMetrics 1.0 scope and compatibility caveat remain valid; current Prometheus guidance prefers native histograms where supported.
- All three technical links resolve to the intended official resources, and the author link resolves to the GitHub profile. No terminal commands, configuration files, or deprecated application APIs appear in the post.
- Runtime restart, state-transition, and multi-instance behavior were reviewed semantically rather than exercised against a deployed exporter. Parser acceptance alone does not establish those behaviors.

# Validation Summary: How to Optimize PromQL Queries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus HTTP API
- Prometheus Go client histograms
- Grafana Prometheus datasource variables

## Sources Consulted
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus aggregation operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming practices: https://prometheus.io/docs/practices/rules/
- Prometheus Go client documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/

## Issues Found
- The aggregation section said to apply aggregations before functions. Prometheus documents that `rate()` must be applied before aggregation for counters so counter resets are detected correctly. I changed the section to recommend recording rules for repeated expensive aggregations while keeping `rate()` before `sum()`.
- The `count()` anti-pattern implied `count(up{job="api"})` is inefficient and that `group()` is the replacement. Prometheus documents `count()` as the operator for counting vector elements, while `group()` returns value `1` for each output series. I changed the section to clarify the difference.
- The query statistics example used `stats=true` and tied it to a specific Prometheus version. Current Prometheus HTTP API documentation describes `stats=<string>` and says `stats=all` includes detailed statistics. I changed the example to `stats=all` and removed the version-specific claim.
- The performance comparison for error-rate percentage had identical "before" and "after" queries while claiming the after query was optimized. I changed the after example to reuse the recording rules defined earlier in the post.
- The API example comment said it checked query duration, but the command counted result series. I changed the comment to describe the command accurately.

## Review Notes
The remaining examples are representative PromQL patterns and assume the shown metric and label names exist in the user's environment. The histogram examples are correct for classic Prometheus histograms; native histograms have different aggregation syntax in current Prometheus versions.

# Validation Summary: How to Use Prometheus Recording Rules for Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prometheus
- Prometheus recording rules
- PromQL
- promtool
- YAML configuration

## Sources Consulted
- Prometheus documentation: Defining recording rules - https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus documentation: Recording rules best practices - https://prometheus.io/docs/practices/rules/
- Prometheus documentation: Prometheus configuration - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus documentation: Unit testing for rules - https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus documentation: promtool - https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Local validation with `promtool` from the `prom/prometheus:latest` Docker image.

## Issues Found
- The post said dashboards query a pre-computed metric that "returns instantly." Prometheus documentation says precomputed results are often much faster, not guaranteed instant, so the wording was corrected.
- The post said recording rules and alerting rules are evaluated at the same interval. Prometheus evaluates rules at the rule group's `interval`, or the global `evaluation_interval` by default, so this was clarified.
- The naming convention section omitted Prometheus's guidance to strip `_total` from counters when using `rate()` or `irate()`, and to list operations with the newest operation first. The explanation and examples were updated.
- The HTTP recording rule names kept `_total` in recorded rate metrics and used a less accurate ratio name. The names and references were updated to match Prometheus recording-rule naming guidance.
- The unit-test input series used counter increments of `1` and `2` per minute while expecting `rate()` results of `1` and `2` per second. The synthetic counter increments were changed to `60` and `120` per minute so the expected rates are correct.

## Review Notes
The corrected recording-rule snippets and unit-test example were checked successfully with `promtool`. The Kubernetes/cAdvisor metric names used in examples are common in Kubernetes environments, but exact labels can vary by exporter and cluster version.

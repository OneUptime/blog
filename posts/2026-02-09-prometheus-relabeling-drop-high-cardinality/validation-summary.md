# Validation Summary: Use Prometheus Metric Relabeling to Drop High-Cardinality Kubernetes Labels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus metric relabeling
- Prometheus Operator
- Kubernetes ServiceMonitor and PodMonitor resources
- Kubernetes kubectl commands

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator additional scrape configuration documentation: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/additional-scrape-config.md
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The original PromQL example attempted to count arbitrary unique label values with a placeholder label name. PromQL cannot dynamically group by a label-name placeholder, so the example was changed to count known high-cardinality labels such as `pod_uid` and `container_id`.
- Several YAML snippets used `labeldrop` with `sourceLabels` and duplicate `regex` keys to conditionally remove labels. Prometheus `labeldrop` matches label names across the label set and cannot be scoped by `sourceLabels` in a single rule. These examples were changed to valid conditional `drop` rules for whole series, with guidance to use separate scrape configs when only a subset of metrics should have labels removed.
- The container handling example used a regex backreference. Prometheus uses RE2 regular expressions, which do not support backreferences. The example was replaced with valid rules for dropping empty or `POD` container samples and optionally dropping the `container` label for all samples from an endpoint.
- The namespace-specific label dropping example had the same unsupported conditional `labeldrop` pattern. It now explains that namespace-specific label dropping should be applied through a namespace-scoped ServiceMonitor or PodMonitor.
- The Prometheus Operator "global relabeling" example incorrectly used `additionalScrapeConfigs` and a ConfigMap. `additionalScrapeConfigs` appends extra scrape jobs from a Secret and does not apply relabeling to all generated scrape configs. The section was corrected to use a default `scrapeClasses` entry with `metricRelabelings`.

## Review Notes
Some cardinality reduction percentages in the post are workload-dependent estimates. They are plausible as illustrative guidance, but they should be measured in each cluster using TSDB status and series-count queries.

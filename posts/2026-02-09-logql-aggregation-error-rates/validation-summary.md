# Validation Summary: Write LogQL Aggregation Queries to Count Kubernetes Error Rates per Microservice

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Kubernetes logging labels
- Grafana dashboards and alerting
- Loki recording rules and ruler
- YAML / Kubernetes ConfigMap

## Sources Consulted
- Grafana Loki LogQL overview: https://grafana.com/docs/loki/latest/query/
- Grafana Loki LogQL query reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki metric queries documentation: https://grafana.com/docs/enterprise-logs/latest/query/metric_queries/
- Grafana Loki query best practices: https://grafana.com/docs/loki/latest/query/bp-query/
- Grafana Loki recording rules documentation: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana data source-managed recording rules documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-recording-rules/create-data-source-managed-recording-rules/
- Grafana data source-managed alert rules documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-data-source-managed-rule/

## Issues Found
- Clarified parser error handling for metric queries. Loki metric queries cannot contain pipeline errors, and parser or numeric label conversion failures are represented with the `__error__` label. Added a note that the examples assume cleanly parseable streams and that `| __error__=""` should be added after stages that can produce errors in mixed data.
- Corrected the "Bottom 5 performing services (highest errors)" example. LogQL's `bottomk` returns the smallest sample values, so it would not identify the highest error rates. Changed the example to use `topk(5, ...)` and renamed the comment to "Worst 5 performing services (highest errors)".
- Corrected the recording-rule comment. Loki recording rules are evaluated by the Loki ruler and remote-written to a Prometheus-compatible backend; Grafana Mimir is one compatible backend, not a strict requirement.

## Review Notes
The LogQL examples rely on extracted labels such as `app`, `service`, `deployment`, `status_code`, `endpoint`, and `version` being available either as stream labels or parsed fields in the selected logs. This is deployment-specific and should be adapted to the reader's Kubernetes logging pipeline.

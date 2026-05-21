# Validation Summary: How to Configure Post-Deployment Verification with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio telemetry and Prometheus metrics
- Prometheus HTTP API, PromQL, and alerting rules
- Kubernetes Jobs
- Flagger canary analysis and MetricTemplate resources
- Bash scripting
- GitHub Actions CI/CD snippets

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio TCP metrics task: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger canary behavior documentation: https://docs.flagger.app/usage/how-it-works
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- Istio metric queries used `namespace` as a label selector. Istio standard metrics expose the destination workload namespace as `destination_workload_namespace`, so the queries in the shell script, Kubernetes Job, Flagger MetricTemplate, and Prometheus alerts were updated.
- Istio verification queries did not filter on `reporter="destination"`, which can mix source-side and destination-side telemetry. Added the destination reporter filter to the relevant request, latency, throughput, custom metric, and alert queries.
- The P99 latency description called it the "worst-case response time." P99 is the 99th percentile, not the absolute worst case, so the wording was corrected.
- The TCP metric was described as "connection errors" and matched `response_flags!=""`. Istio documents `istio_tcp_connections_closed_total` as closed connections, and response flags identify response or connection details. Updated the wording and query to count TCP closed-connection series with non-normal response flags.
- The Kubernetes Job used `curlimages/curl:latest` but relied on `bc` and fragile JSON parsing with `grep`. Updated it to use an Alpine image that installs `curl`, `jq`, and `bc`, and changed the parsing to `jq`.
- The Flagger threshold explanation said "more than 5 consecutive checks fail." Flagger documents `threshold` as the maximum number of failed metric checks before rollback, so the explanation was corrected.
- The custom `request_path` metric example assumed a non-standard Istio metric label. Added a note that this requires configuring Istio telemetry to add the `request_path` tag.

## Review Notes
The examples are now technically consistent with current official docs. In production, teams should also consider handling no-traffic windows explicitly, pinning container image versions according to their supply-chain policy, and testing PromQL queries against their actual Istio telemetry configuration because metric dimensions can be customized or suppressed.

# Validation Summary: Configure Prometheus Alerting Rules with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Prometheus
- Prometheus Operator
- PrometheusRule custom resources
- PromQL alerting expressions

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus rule aggregation best practices: https://prometheus.io/docs/practices/rules/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The API error-rate alert divided unaggregated `rate()` vectors. That can produce incorrect per-label matching behavior instead of a service-wide error ratio, so the expression now sums the 5xx request rate and total request rate separately before dividing.
- The API p99 latency alert passed raw classic histogram bucket rates to `histogram_quantile()`. For an aggregate API p99, Prometheus requires preserving the `le` label while aggregating buckets, so the expression now uses `sum by (le) (...)`.
- The node disk alert compared free disk ratio but described the value as full disk usage. The expression now calculates used ratio with `1 - avail / size` and compares it to `0.85`, matching the alert name and annotation.
- The Flux `dependsOn` example implied it could depend directly on Prometheus or a HelmRelease. Flux Kustomization `dependsOn` references other Flux Kustomization resources, so the example now names a `monitoring-stack` Kustomization and clarifies the comment.
- The Flux validation command used `flux get kustomization`. The official command is `flux get kustomizations`, so the command was updated.

## Review Notes
The PrometheusRule selector labels are technically valid as an example, but real kube-prometheus-stack installations often use chart-specific selectors. Readers should align those labels with their Prometheus resource's `ruleSelector`.

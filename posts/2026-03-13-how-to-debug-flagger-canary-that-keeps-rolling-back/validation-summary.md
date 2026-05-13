# Validation Summary: How to Debug Flagger Canary That Keeps Rolling Back

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Flagger
- Kubernetes
- kubectl
- Prometheus
- PromQL
- Canary deployments
- Flagger MetricTemplate resources
- Flagger load tester webhooks

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger Monitoring documentation: https://docs.flagger.app/usage/monitoring
- Flagger GitHub README / Canary CRD examples: https://github.com/fluxcd/flagger
- Flagger metrics provider API documentation: https://pkg.go.dev/github.com/fluxcd/flagger@v1.43.0/pkg/metrics/providers
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus Querying Basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The post implied the built-in Flagger `request-success-rate` metric could be validated with a generic `http_requests_total` query. Flagger's built-in checks are provider-specific Prometheus queries, so I changed the wording to describe the query as an application HTTP counter example and told readers to validate the actual metric source used by their mesh, ingress controller, or custom MetricTemplate.
- The canary traffic query used `pod=~"podinfo-canary.*"`, but `podinfo-canary` is a generated service name in common Flagger examples, not the target deployment's pod name prefix. I changed the selector to match `podinfo-*` pods while excluding `podinfo-primary-*` pods.
- The MetricTemplate guidance said Prometheus vector results cause evaluation failure. Flagger's provider expects a `float64`, errors when no values are found, and uses the first result when multiple values are returned. I updated the note to recommend aggregating custom Prometheus queries to a single series to avoid ambiguous evaluations.

## Review Notes
The `kubectl` commands and YAML field names are consistent with current Kubernetes and Flagger documentation. The Prometheus queries are illustrative and still depend on the metric names and labels emitted by the user's application, service mesh, or ingress controller.

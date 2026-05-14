# Validation Summary: How to Troubleshoot Flagger Canary Rollback in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flagger Canary resources
- Flux-managed Kubernetes clusters
- Kubernetes kubectl commands, events, pods, services, and deployments
- Prometheus and PromQL
- Istio service mesh metrics and routing resources
- Flagger webhooks and load tester

## Sources Consulted
- Flagger How it works: https://docs.flagger.app/usage/how-it-works
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Flagger Webhooks: https://docs.flagger.app/usage/webhooks
- Flagger Deployment Strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Monitoring: https://docs.flagger.app/main/usage/monitoring
- Flagger FAQ, including Istio metric queries: https://fluxcd.io/flagger/faq/
- Flagger v1beta1 API reference: https://pkg.go.dev/github.com/fluxcd/flagger/pkg/apis/flagger/v1beta1
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The Istio Prometheus examples queried `destination_workload="my-app-canary"`. Flagger's documented Istio queries filter on the destination workload, while the generated canary service selects the target workload pods. I changed the examples to query `destination_workload="my-app"` and added `destination_workload_namespace="default"`.
- The slow-startup scenario suggested using `skipAnalysis` for initial iterations and set `iterations: 0`. Flagger's `skipAnalysis` skips the analysis phase entirely and `iterations` is a total iteration count, not an initial skip count. I changed the example to use `progressDeadlineSeconds` and a higher failure threshold for warm-up tolerance.
- The rollback monitoring command claimed to count rollbacks in the last 24 hours, but Kubernetes events retention is cluster-dependent and the command did not filter by time. I changed the wording to "currently retained events."
- The post described `flagger_canary_status` as a rollback count. Flagger documents it as a last-known status gauge, with `flagger_canary_failures_total` as the failure counter. I updated the description and added a `flagger_canary_failures_total` query.

## Review Notes
Most commands and configuration snippets match current Flagger and Kubernetes documentation. The examples assume the application uses Flagger's default supported selector convention and Istio's standard telemetry labels; users with custom selector labels, Gateway API routing, or a non-Istio provider may need to adapt metric selectors accordingly.

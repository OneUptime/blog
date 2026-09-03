# Validation Summary: How to Correlate a Metric Spike with Deployments, Configuration Changes, and Kubernetes Events

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes Deployments, ReplicaSets, Pods, ConfigMaps, Events, annotations, and auditing
- `kubectl events` and `kubectl rollout history`
- Prometheus and PromQL counters and rates
- OpenTelemetry resource and deployment semantic conventions
- CI/CD deployment and configuration correlation

## Sources Consulted

- [Kubernetes Events overview](https://kubernetes.io/docs/reference/kubernetes-api/events/)
- [Kubernetes Event v1 API](https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/)
- [kubectl events](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes Deployments: checking rollout history](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#checking-rollout-history-of-a-deployment)
- [Kubernetes annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/)
- [Kubernetes auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [OpenTelemetry service semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry deployment attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Issues Found

- The PromQL discussion said to handle counter resets separately in the real rule. Prometheus `rate()` automatically adjusts for counter resets, and the example correctly applies `rate()` before aggregation so resets remain detectable. The sentence was corrected to state this while preserving the valid warning that production rules must handle a zero denominator.

## Review Notes

- The metric and label names in the PromQL example are intentionally deployment-specific, as the post states.
- `deployment.id`, `deployment.name`, and `deployment.status` are Development-stage OpenTelemetry semantic-convention attributes as of the review date; pinning the semantic-convention version remains appropriate.
- `kubectl events` and its `--for`, `--all-namespaces`, and `--types` options are current, but readers need a kubectl version that includes the `events` subcommand.
- Kubernetes Events remain best-effort supplemental data with limited retention; the post correctly distinguishes them from audit events.

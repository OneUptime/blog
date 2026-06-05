# Validation Summary: How to Configure the K8s Leader Elector Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib Kubernetes Leader Elector extension
- OpenTelemetry Collector Kubernetes Cluster receiver
- Kubernetes Lease API and RBAC
- Kubernetes Deployments, Services, health probes, and PodDisruptionBudgets
- OTLP HTTP exporter and Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector contrib Kubernetes Leader Elector extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/extension/k8sleaderelector
- OpenTelemetry Collector contrib Kubernetes Leader Elector extension config/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/extension/k8sleaderelector/config.go
- OpenTelemetry Collector contrib Kubernetes Cluster receiver README and RBAC examples: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/receiver/k8sclusterreceiver
- OpenTelemetry Collector contrib Kubernetes Cluster receiver config/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/receiver/k8sclusterreceiver/config.go
- OpenTelemetry Collector Debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector Health Check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Kubernetes Lease concept documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The examples enabled `k8s_leader_elector` but did not configure the `k8s_cluster` receiver with `k8s_leader_elector: k8s_leader_elector`. Added the receiver-side reference because the extension only gates components that explicitly integrate with it.
- The basic configuration used `k8s_observer` even though it was not used by the receiver examples, and Kubernetes probes referenced port 13133 without a configured health endpoint. Replaced it with the `health_check` extension and enabled it in `service.extensions`.
- `allocatable_types_to_report` used `storage`, which is not a documented k8s_cluster allocatable type. Changed it to `ephemeral-storage`.
- The deployment image used `otel/opentelemetry-collector-contrib:0.93.0`, which predates the documented leader elector extension. Updated examples to the current official release image `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.153.0`.
- Several snippets used `${ONEUPTIME_TOKEN}`. Updated them to the current Collector environment substitution form `${env:ONEUPTIME_TOKEN}`.
- The RBAC example omitted several resources required by the documented k8s_cluster receiver and included `nodes/stats`, which is not part of the receiver's documented RBAC example. Expanded the ClusterRole to match the official receiver permissions and kept the Lease permissions for leader election.
- The advanced examples implied leader election could make arbitrary Prometheus receiver and batch-job pipelines leader-only. Reworked that section to use receiver instances that explicitly support `k8s_leader_elector`.
- Several examples used unsupported extension subkeys: `logging`, `require_leader_confirmation`, and `shutdown`. Removed those fields and adjusted the explanations to match the extension's documented configuration.
- The monitoring section listed undocumented `otelcol_k8s_leader_elector_*` metrics. Replaced those with supported monitoring signals: Collector logs, Kubernetes Lease state, and k8s_cluster receiver output.
- The debugging section used the deprecated/removed `logging` exporter and `loglevel` setting. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- Lease timing wording described `renew_deadline` as a renewal interval. Updated wording to describe it as a renewal deadline.

## Review Notes
The extension is listed as alpha in OpenTelemetry Collector contrib. The post is now accurate for Collector contrib v0.153.0, but future Collector releases may change component stability or configuration fields.

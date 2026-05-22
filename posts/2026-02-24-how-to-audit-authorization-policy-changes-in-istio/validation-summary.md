# Validation Summary: How to Audit Authorization Policy Changes in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy and Telemetry APIs
- Kubernetes audit logging, RBAC, CronJob, and kubectl
- Flux notification-controller Alerts
- Prometheus alerting rules and PromQL
- Alertmanager API
- Fluentd and Elasticsearch log shipping
- Bash, yq, and Python snippets for audit reporting

## Sources Consulted
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio access log Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio security troubleshooting documentation for RBAC debug logging: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio command reference for istioctl proxy-config log: https://istio.io/latest/docs/reference/commands/istioctl/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Alertmanager API notes: https://github.com/prometheus/alertmanager
- Elasticsearch mapping type removal documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types

## Issues Found
- The Fluentd Elasticsearch example used `type_name _doc`, but Elasticsearch 8 no longer supports mapping types. Removed the deprecated setting.
- The watcher parsed watch events as JSON objects without requesting watch event wrappers. Added `--output-watch-events` and switched to a Go template so `.type` and `.object.metadata.*` are actually available.
- The watcher posted to Alertmanager `/api/v1/alerts`, but Alertmanager API v1 has been removed in current versions. Updated the endpoint to `/api/v2/alerts`.
- The RBAC role was reused by the compliance report, but it did not allow listing namespaces. Added `list` on core `namespaces`.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, which is not the current Alert API version. Updated it to `notification.toolkit.fluxcd.io/v1beta3`.
- The access logging section claimed the Telemetry example included RBAC information, but the snippet only filters denied access logs. Adjusted the wording to say it captures denied requests.
- The Prometheus examples grouped by a non-standard `namespace` label. Updated them to use Istio's standard `destination_workload_namespace` and `source_workload_namespace` labels.

## Review Notes
The examples are now aligned with current Istio, Kubernetes, Flux, Prometheus, Alertmanager, and Elasticsearch documentation. In production, the watcher container image should be verified or replaced with a pinned custom image that includes every runtime tool used by the script, especially `curl`.

# Validation Summary: How to Use SUSE Observability for Kubernetes Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Observability
- Kubernetes
- SUSE Observability Query Language (STQL)
- SUSE Observability CLI (`sts`)
- PromQL
- `kubectl`

## Sources Consulted
- SUSE Observability Kubernetes views: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/views/k8s-views.html
- SUSE Observability Topology Perspective: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/views/k8s-topology-perspective.html
- SUSE Observability filters and STQL: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/views/k8s-filters.html
- SUSE Observability threshold monitors with the CLI: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/k8s-add-monitors-cli.html
- SUSE Observability monitor CLI reference: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/custom-integrations/monitors/cli.html
- SUSE Observability notifications: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/alerting/notifications/configure.html
- SUSE Observability custom views: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/views/k8s-custom-views.html
- SUSE Observability timeline and time travel: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/stackstate-ui/k8sTs-timeline-time-travel.html
- SUSE Observability Kubernetes change diff: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/troubleshooting/k8s-changes.html
- SUSE Observability custom metric bindings and PromQL examples: https://documentation.suse.com/cloudnative/suse-observability/latest/en/use/metrics/k8s-add-charts.html
- SUSE Observability PromQL guidance: https://documentation.suse.com/cloudnative/suse-observability/latest/en/setup/custom-integrations/metric-bindings/writing-promql.html
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Health states were described as `GREEN`, `ORANGE`, and `RED`. Updated them to SUSE Observability health-state values `CLEAR`, `DEVIATING`, `CRITICAL`, and `UNKNOWN`, with "red" kept only as a UI color description.
- The "Perspective" concept was described as a filtered topology view. Updated it to describe perspectives as tabs/lenses within a view, matching current SUSE Observability docs.
- UI navigation used `Views → Kubernetes` and `Views → Kubernetes → Nodes`. Updated this to the current Kubernetes main-menu navigation.
- STQL examples used unsupported component type names such as `kubernetes-pod`, camel-case `healthState`, color-state values such as `RED`, and a metric comparison inside an STQL topology query. Replaced them with current STQL patterns using `type = "pod"`, `type = "deployment"`, `healthstate`, and `withNeighborsOf`.
- The monitor example used a non-documented `POST /api/v1/monitors` payload. Replaced it with a documented monitor YAML structure and `sts monitor apply -f monitor.yaml`.
- The post implied monitors send alerts directly. Updated this to distinguish monitors, which calculate health states, from notifications, which send alerts.
- The node STQL example used `type = "kubernetes-node"` and `healthState = "ORANGE"`. Updated it to `type = "node"` and `healthstate = "DEVIATING"`.
- The change-history section described a generic **Changes** tab and timeline slider. Updated it to use the documented timeline/time-travel workflow, Events perspective, and Kubernetes deployment change diff view.
- The custom view steps included a non-documented Team/Personal visibility setting. Replaced this with documented `Save view as...`, description/identifier, sharing, and starring behavior.
- The metric examples used standard kube-state-metrics metric names as if they were SUSE Observability's built-in metric names. Replaced them with documented SUSE Observability metric names and PromQL patterns for pod CPU, container restarts, and unavailable deployment replicas.
- Best-practice wording suggested topology filters are an access-control mechanism. Updated this to frame filters as focused operational views, and added notifications alongside monitors.

## Review Notes
The validation assumes the current SUSE Observability "latest" documentation as of 2026-04-21. Some metric names can vary when teams ingest external Prometheus metrics; the revised examples use SUSE Observability's documented built-in Kubernetes metric names and metric-binding patterns.

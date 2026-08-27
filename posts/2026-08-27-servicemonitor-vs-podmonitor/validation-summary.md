# Validation Summary: ServiceMonitor vs PodMonitor: Which One Should Scrape Your Kubernetes Workload?

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes
- `ServiceMonitor` and `PodMonitor` custom resources
- Kubernetes Services, Pods, Endpoints, and EndpointSlices
- Kubernetes RBAC and NetworkPolicy
- Prometheus Kubernetes service discovery

## Sources Consulted

- [Prometheus Operator getting started](https://prometheus-operator.dev/docs/developer/getting-started/)
- [Prometheus Operator API reference: `ServiceMonitor`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Prometheus Operator API reference: `ServiceMonitorSpec`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator API reference: `PodMonitor`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PodMonitor)
- [Prometheus Operator API reference: `PodMonitorSpec`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PodMonitorSpec)
- [Prometheus Operator API reference: `PodMetricsEndpoint`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PodMetricsEndpoint)
- [Prometheus Operator API reference: `Prometheus`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Prometheus)
- [Prometheus Operator design](https://prometheus-operator.dev/docs/getting-started/design/)
- [Prometheus Operator RBAC guide](https://prometheus-operator.dev/docs/platform/rbac/)
- [Prometheus Operator EndpointSlice migration and troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Prometheus Kubernetes service discovery configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus Operator high-availability guide](https://prometheus-operator.dev/docs/platform/high-availability/)
- [Thanos Querier deduplication](https://thanos.io/tip/components/query.md/#deduplication)

## Issues Found

- The PodMonitor discussion implied that numeric `portNumber` could bypass declared Pod port metadata. The text now states that both `port` and `portNumber` match declared Pod ports; the current API explicitly says `portNumber` cannot enable scraping of an undeclared port.
- The selectorless-Service guidance mentioned manually managed EndpointSlices without requiring the matching discovery role. The text now requires `spec.serviceDiscoveryRole` to be set to `EndpointSlice` on the ServiceMonitor or Prometheus resource so an EndpointSlice-only backend is actually discovered.
- The NetworkPolicy statement was unconditional and referred only to Pod IPs, even though Pods are non-isolated by default and a ServiceMonitor can discover non-Pod addresses. The text now qualifies the requirement to cases where NetworkPolicy isolation applies and refers to the applicable ingress and egress rules for the discovered target addresses.
- The migration checklist's “temporary label” could be mistaken for a monitor metadata label, which is not automatically propagated to targets or series. The text now specifies a temporary target label through endpoint `relabelings`, or a distinct `job` label.

## Review Notes

- All YAML blocks parse successfully. The complete Service, ServiceMonitor, and PodMonitor examples use current `monitoring.coreos.com/v1` fields; the shorter container-port and Prometheus-spec blocks are intentionally contextual fragments.
- All external links in the post resolve successfully, and the Prometheus Operator and Prometheus API fragment identifiers exist.
- Kubernetes deprecated the core/v1 Endpoints API in v1.33, and Prometheus recommends EndpointSlice discovery. The current Prometheus Operator API still defaults `serviceDiscoveryRole` to `Endpoints` when no role is configured, so installations should coordinate the role and RBAC when migrating.
- The deprecation statement is correctly scoped to PodMonitor's `PodMetricsEndpoint.targetPort`. ServiceMonitor's `Endpoint.targetPort` remains available and is not marked deprecated.
- The post describes the current API. Older Prometheus Operator CRDs may not provide `portNumber` or per-ServiceMonitor `serviceDiscoveryRole`, so users of older installations should check the CRD schema before applying those fields.

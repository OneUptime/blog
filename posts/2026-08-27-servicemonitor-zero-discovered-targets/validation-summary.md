# Validation Summary: Debug ServiceMonitor Zero Targets from Service to EndpointSlice

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- ServiceMonitor custom resources
- Kubernetes Services and Pods
- Kubernetes EndpointSlices and legacy Endpoints
- Kubernetes service discovery and RBAC
- `kubectl`

## Sources Consulted

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator troubleshooting guide](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Prometheus Operator configuration generator source](https://github.com/prometheus-operator/prometheus-operator/blob/main/pkg/prometheus/promcfg.go)
- [Prometheus Kubernetes service-discovery configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus HTTP API: targets](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Endpoints deprecation announcement](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl` JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The opening discovery chain named only EndpointSlice even though the Prometheus Operator defaults to the legacy Endpoints discovery role. It now names both Endpoints and EndpointSlice, and the conclusion uses the object selected by the effective role.
- The description of `namespaceSelector.matchNames` did not account for `Prometheus.spec.ignoreNamespaceSelectors`. A caveat now explains that this Prometheus setting ignores the ServiceMonitor namespace selector and confines discovery to the ServiceMonitor namespace.
- The post attributed endpoint publication to the Kubernetes Service controller. It now identifies the EndpointSlice and legacy Endpoints controllers, which are the controllers that publish matching Pods as endpoints.
- The readiness bullet equated `conditions.ready` directly with Pod readiness. It now distinguishes `serving`, `terminating`, and `ready`, including the `publishNotReadyAddresses` override and the API rule that an unset `ready` value is interpreted as true.
- The post said a self-managed EndpointSlice required a `managed-by` label. The Service association label is required for the described linkage, while Kubernetes recommends rather than schema-requires `endpointslice.kubernetes.io/managed-by`; the wording now reflects that distinction.
- The discovery-role commands were presented as proving the effective role, but they only display configured CR fields. The post now tells readers to verify the generated `kubernetes_sd_configs[].role`, documents the Operator fallback to Endpoints, and gives the Prometheus v2.21.0 and Kubernetes v1.21 API requirements for EndpointSlice discovery.
- The Service Discovery instructions assumed the generated job would always be visible and treated namespace or RBAC as the only causes of no raw entries. They now cover a missing UI job when no Service matches, empty Endpoints or EndpointSlices, role selectors, discovery logs, and the distinction between dropped and active targets.
- The post treated any one active target as proof that discovery was fully resolved. It now requires all intended targets to be active and tells readers to continue tracing any missing subset.

## Review Notes

- All YAML, shell loops, label selectors, `kubectl` flags, and the nested JSONPath expression are syntactically valid and current.
- The `kubectl auth can-i --as=...` checks require the caller to have impersonation permission. Current Prometheus Kubernetes discovery uses list/watch for EndpointSlices, Services, and Pods; enabling additional attached metadata can require further permissions, such as list/watch on Nodes.
- The legacy Endpoints API is deprecated starting with Kubernetes v1.33 but remains available for compatibility. EndpointSlice is the recommended discovery role on compatible deployments.

# Validation Summary: Why Does Prometheus Ignore a ServiceMonitor That Exists in Kubernetes?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- Prometheus Operator `Prometheus` and `ServiceMonitor` custom resources
- Kubernetes Services, Endpoints, and EndpointSlices
- Kubernetes RBAC and ServiceAccounts
- `kubectl`, JSONPath, `jq`, `base64`, `gunzip`, and `grep`
- kube-prometheus-stack Helm chart

## Sources Consulted

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator design: resource selectors](https://prometheus-operator.dev/docs/getting-started/design/#resource-selectors)
- [Prometheus Operator troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Prometheus Operator getting started](https://prometheus-operator.dev/docs/developer/getting-started/)
- [Prometheus Operator RBAC guide](https://prometheus-operator.dev/docs/platform/rbac/)
- [Prometheus Operator upstream Deployment manifest](https://github.com/prometheus-operator/prometheus-operator/blob/main/example/rbac/prometheus-operator/prometheus-operator-deployment.yaml)
- [Prometheus Operator example Prometheus ClusterRole](https://github.com/prometheus-operator/prometheus-operator/blob/main/example/rbac/prometheus/prometheus-cluster-role.yaml)
- [kube-prometheus-stack Operator label template](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus-operator/_prometheus-operator.tpl)
- [kube-prometheus-stack values](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml)
- [Kubernetes label selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [`kubectl port-forward` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/)
- [Kubernetes Endpoints deprecation announcement](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [Prometheus Kubernetes service-discovery configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus targets API](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- [Prometheus current UI route and menu definitions](https://github.com/prometheus/prometheus/blob/main/web/ui/mantine-ui/src/App.tsx)

## Issues Found

- The Operator Deployment lookup assumed `app.kubernetes.io/name=prometheus-operator`. The default kube-prometheus-stack chart renders a different value, so the command could return no Deployment. Changed the instructions to list Deployments without assuming an installation-specific name or label and added the actual `kubectl logs` command.
- The generated-configuration check grepped only the monitor name, which could match another monitor or a substring. Changed it to search for the Operator's full `serviceMonitor/<namespace>/<name>/` job prefix with fixed-string matching.
- The namespace-selection explanation omitted `Prometheus.spec.ignoreNamespaceSelectors`. Added the documented override, which confines discovery to the ServiceMonitor's own namespace when enabled.
- The post presented a named Service port as mandatory for every endpoint. `endpoints[].port` does name `Service.spec.ports[].name`, but the API also supports `endpoints[].targetPort` for Pod container ports. Qualified the named-port explanation and documented precedence when both fields are set.
- The RBAC commands checked only `list`, omitted the default `Endpoints` discovery resource, and used cluster-wide authorization checks even for namespace-scoped discovery. Added the discovery-role inheritance and default, the Kubernetes 1.33 Endpoints deprecation, checks for `get`, `list`, and `watch`, correct target-namespace scoping, both discovery-resource choices, the impersonation prerequisite, and the optional Node permission requirement.
- Port-forwarding the shared default `prometheus-operated` Service may reach the wrong instance when multiple Prometheus resources share a namespace. Changed the commands to select and port-forward a Pod belonging to the specific Prometheus resource by its Operator-reserved label.
- The current Prometheus UI labels are **Service discovery** and **Target health**, not **Service Discovery** and **Targets**. Updated the navigation labels.
- A selector or port mismatch may yield dropped candidates rather than no discovery data at all. Changed the classification to distinguish a configured job with no active target and directed readers to inspect dropped targets.
- The final Prometheus link documents the targets HTTP API rather than a UI target page. Corrected the link text and aligned the conclusion with the current target-health terminology.

## Review Notes

- The post does not pin Prometheus, Prometheus Operator, Kubernetes, Helm chart, or `kubectl` versions. It was checked against the current official documentation and upstream source available on 2026-08-27.
- The deprecated unmanaged-configuration behavior is described accurately: it applies when all four scrape-object selectors are null. The Operator documentation says this behavior will be removed in the next major CRD version.
- The Event query is valid, but Kubernetes Events are best-effort and short-lived; `.lastTimestamp` can be empty for newer event series even though it remains available on the core Event representation.

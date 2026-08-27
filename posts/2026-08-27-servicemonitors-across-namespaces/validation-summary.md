# Validation Summary: How to Discover ServiceMonitors and Scrape Services Across Different Namespaces

## Status

validated

## Post Type

Technical configuration guide / tutorial

## Technologies Covered

- Prometheus and Prometheus Kubernetes service discovery
- Prometheus Operator and the `Prometheus` and `ServiceMonitor` CRDs
- Kubernetes Namespaces and label selectors
- Kubernetes RBAC, Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- Kubernetes ServiceAccounts
- Kubernetes Services, Pods, Endpoints, and EndpointSlices
- Kubernetes Secrets and ConfigMaps
- kube-prometheus-stack and Helm-rendered Prometheus resources
- `kubectl`

## Sources Consulted

- [Prometheus Operator API reference: `PrometheusSpec`, `CommonPrometheusFields`, `ServiceMonitorSpec`, `NamespaceSelector`, and `Endpoint`](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator design: resource selectors](https://prometheus-operator.dev/docs/getting-started/design/#resource-selectors)
- [Prometheus Operator RBAC guidance](https://prometheus-operator.dev/docs/platform/rbac/)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes)
- [Prometheus Operator CLI reference](https://prometheus-operator.dev/docs/platform/operator/)
- [Prometheus Operator v0.85.0 release notes](https://github.com/prometheus-operator/prometheus-operator/releases/tag/v0.85.0)
- [Prometheus Operator v0.93.1 configuration generator](https://github.com/prometheus-operator/prometheus-operator/blob/v0.93.1/pkg/prometheus/promcfg.go)
- [Prometheus Operator v0.93.1 ServiceMonitor resource selector](https://github.com/prometheus-operator/prometheus-operator/blob/v0.93.1/pkg/prometheus/resource_selector.go)
- [Prometheus configuration reference: Kubernetes service discovery](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus Kubernetes discovery implementation](https://github.com/prometheus/prometheus/blob/main/discovery/kubernetes/kubernetes.go)
- [Kubernetes RBAC documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes ServiceAccount documentation](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes EndpointSlice documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [kube-prometheus-stack values](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml) and [Prometheus resource template](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/prometheus.yaml)

## Issues Found

- The EndpointSlice RBAC example did not select EndpointSlice discovery. An unset Prometheus `serviceDiscoveryRole` defaults to `Endpoints`, so the shown Prometheus resource would try to use core `endpoints` while its Role granted only `endpointslices`. The Prometheus example now sets `serviceDiscoveryRole: EndpointSlice`.
- The RoleBinding and authorization commands used the `monitoring/prometheus` ServiceAccount, but the Prometheus resource did not assign that ServiceAccount to its Pods. Kubernetes otherwise assigns the namespace's `default` ServiceAccount. The topology and Prometheus spec now explicitly use `serviceAccountName: prometheus`.
- The `any: true` example omitted an important RBAC consequence. It generates all-namespaces discovery requests, which namespace-scoped RoleBindings do not authorize even if duplicated in every namespace. The post now states that this mode needs cluster-wide discovery reads, typically through a ClusterRoleBinding.
- The RBAC instructions said to repeat only the RoleBinding for each named target namespace. Because the binding references a namespaced Role, both objects must exist in each namespace. The text now says to repeat both objects or bind one reusable ClusterRole through a RoleBinding in each explicitly named namespace.
- The authorization checks tested only `list`, although the documented Role grants and Prometheus requires `get`, `list`, and `watch`. They now check all three verbs for Services, Pods, and EndpointSlices and state that the caller needs permission to impersonate the ServiceAccount.
- The post did not distinguish the Prometheus Operator's configuration-generation identity from the Prometheus Pod's target-discovery identity. The credentials discussion now names the Operator service account explicitly and notes that enabling cross-namespace Secret and ConfigMap watches also requires corresponding list/watch RBAC.
- The description of two namespace gates did not account for Operator namespace scoping and RBAC. It is now qualified as the Prometheus CRD-level model and states that the Operator must be able to watch the selected configuration namespaces.
- The heading called `ignoreNamespaceSelectors` a cluster-wide restriction even though it is a field on an individual Prometheus resource. The heading now calls it a Prometheus-level restriction, and the remediation correctly says that a monitor is needed in each target namespace when the field is true.
- The troubleshooting outcomes were too categorical. A missing generated monitor can also be rejected or unreconciled, and a generated job without targets can also result from Service, port, endpoint, or relabeling problems. The diagnostic text now includes those cases while preserving the correct meaning of an active but down target.

## Review Notes

- The selector semantics are otherwise correct: `serviceMonitorNamespaceSelector` is a Kubernetes label selector over Namespace objects; `ServiceMonitor.spec.namespaceSelector` contains `any` and `matchNames`; `any: true` takes precedence; and an empty `matchNames` with `any: false` means the monitor's own namespace.
- EndpointSlice discovery requires Prometheus 2.21 or later and a supported EndpointSlice API. The current Operator falls back to Endpoints discovery otherwise. The `discovery.k8s.io/v1` EndpointSlice API is stable in Kubernetes 1.21 and later.
- `--watch-referenced-objects-in-all-namespaces` was introduced in Prometheus Operator 0.85.0 and defaults to false in the Operator CLI. Deployments may set it explicitly, so checking the live Operator arguments remains the correct advice.
- Current kube-prometheus-stack defaults can render an empty ServiceMonitor selector as a Helm release-label selector and an empty ServiceMonitor namespace selector as `{}`. A nonempty custom ServiceMonitor selector is rendered as supplied. Inspecting the installed Prometheus resource is therefore the right final check.
- All YAML snippets parse successfully, all Bash blocks pass shell syntax validation, the RBAC API versions and resource names are current, and the referenced documentation URLs resolve to the intended official resources.

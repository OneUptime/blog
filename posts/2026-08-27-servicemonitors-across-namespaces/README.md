# How to Discover ServiceMonitors and Scrape Services Across Different Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes, Namespaces, RBAC

Description: Configure the two namespace-selection gates and discovery RBAC required for Prometheus to find ServiceMonitors and scrape Services in other namespaces.

---

At the Prometheus CRD level, cross-namespace ServiceMonitor setups have two independent namespace gates:

```text
Prometheus
  -> serviceMonitorNamespaceSelector
     chooses namespaces containing ServiceMonitor objects

ServiceMonitor
  -> namespaceSelector
     chooses namespaces containing target Services
```

Opening only one gate is not enough. The Operator must be able to watch the selected configuration namespaces, and Prometheus also needs Kubernetes discovery permissions in every target namespace.

## Example Topology

Assume:

- the Prometheus resource runs in `monitoring`;
- its Pods use the `prometheus` ServiceAccount in `monitoring`;
- ServiceMonitor objects live in team namespaces such as `observability-payments`;
- application Services live in `payments-prod` and `payments-staging`.

Label only the namespaces from which platform Prometheus should accept monitor definitions:

```bash
kubectl label namespace observability-payments \
  platform-prometheus=enabled
```

Configure the Prometheus resource to use that ServiceAccount and EndpointSlice discovery, then select those namespaces and a controlled set of monitors:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: platform
  namespace: monitoring
spec:
  serviceAccountName: prometheus
  serviceDiscoveryRole: EndpointSlice
  serviceMonitorNamespaceSelector:
    matchLabels:
      platform-prometheus: enabled
  serviceMonitorSelector:
    matchLabels:
      prometheus: platform
```

This first selector evaluates Namespace labels. The second evaluates `ServiceMonitor.metadata.labels`.

Create a monitor in the selected configuration namespace and explicitly name its target namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payments-api
  namespace: observability-payments
  labels:
    prometheus: platform
spec:
  namespaceSelector:
    matchNames:
      - payments-prod
      - payments-staging
  selector:
    matchLabels:
      app.kubernetes.io/name: payments-api
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

`ServiceMonitor.spec.namespaceSelector` is not a Kubernetes `LabelSelector`. It contains `any` and `matchNames`. `any: true` selects all namespaces and takes precedence over `matchNames`. If neither is set, target discovery stays in the ServiceMonitor's namespace.

## Choose the Narrowest Useful Namespace Scope

An explicit `matchNames` list is easy to audit. `any: true` is convenient for cluster-wide platform monitors, but it lets one ServiceMonitor selector search every namespace:

```yaml
spec:
  namespaceSelector:
    any: true
```

Use it only with a selective Service label contract and suitable multi-tenant controls. A broad namespace selector combined with `selector: {}` can create a very large and surprising target set.

`any: true` also produces an all-namespaces Kubernetes discovery request. Namespace-scoped RoleBindings do not authorize that request; Prometheus needs cluster-wide discovery reads, typically through a ClusterRoleBinding.

The Prometheus-level namespace selector has different syntax and semantics:

```yaml
spec:
  serviceMonitorNamespaceSelector: {}
```

An empty selector matches all namespaces. A null selector searches the Prometheus object's namespace only. Namespace labels are often safer than `{}` because they create an explicit opt-in boundary for monitor definitions.

## Grant Discovery RBAC Where the Targets Live

Prometheus performs Kubernetes service discovery. Its service account needs `get`, `list`, and `watch` access to the discovery objects in target namespaces. With `serviceDiscoveryRole: EndpointSlice`, the namespace Role for this example includes Services, Pods, and EndpointSlices:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prometheus-discovery
  namespace: payments-prod
rules:
  - apiGroups: [""]
    resources: ["services", "pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["discovery.k8s.io"]
    resources: ["endpointslices"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prometheus-discovery
  namespace: payments-prod
subjects:
  - kind: ServiceAccount
    name: prometheus
    namespace: monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: prometheus-discovery
```

Repeat both the Role and RoleBinding in each namespace listed by `matchNames`, or bind a reusable ClusterRole with a RoleBinding in each of those namespaces. If the active `serviceDiscoveryRole` is `Endpoints`, grant access to core `endpoints` instead of, or during migration alongside, EndpointSlices.

Verify authorization as the actual service account:

```bash
for verb in get list watch; do
  for resource in services pods endpointslices.discovery.k8s.io; do
    kubectl auth can-i "$verb" "$resource" -n payments-prod \
      --as=system:serviceaccount:monitoring:prometheus
  done
done
```

The user running these checks must be allowed to impersonate the ServiceAccount.

The Prometheus Operator's service account, not the Prometheus service account above, also needs access to referenced Secrets and ConfigMaps while generating configuration. Authentication selectors in a ServiceMonitor reference objects in the ServiceMonitor's namespace, not the target Service namespace. Keep credentials with the monitor and grant only the required reads.

Reading a referenced object and watching it for later changes are separate concerns. Prometheus Operator 0.85 and later provide `--watch-referenced-objects-in-all-namespaces`, which enables watches for Secrets and ConfigMaps in configuration-resource namespaces as well as Prometheus workload namespaces. Enabling it also requires the Operator's RBAC to allow those list and watch operations. Without that option, a credential referenced by a ServiceMonitor outside the Prometheus workload namespace can still require another reconciliation trigger before an update is reflected. Check the running Operator arguments when rotations do not propagate.

## Check the Prometheus-Level Restriction

The Prometheus CR has an administrator control named `ignoreNamespaceSelectors`. When true, the Operator ignores `spec.namespaceSelector` on ServiceMonitor, PodMonitor, and Probe resources and restricts them to their own namespaces.

```bash
kubectl get prometheus platform -n monitoring \
  -o jsonpath='{.spec.ignoreNamespaceSelectors}{"\n"}'
```

If this is `true`, a cross-namespace ServiceMonitor cannot override it. Create a monitor in each target namespace, change the administrator policy, or use a design approved for that cluster.

## Validate Both Selections

Check the first gate:

```bash
kubectl get namespace observability-payments --show-labels
kubectl get servicemonitor -n observability-payments \
  -l prometheus=platform
```

Check the second gate:

```bash
kubectl get service -n payments-prod \
  -l app.kubernetes.io/name=payments-api
kubectl get service -n payments-staging \
  -l app.kubernetes.io/name=payments-api
```

Then inspect generated configuration and Prometheus **Status > Service Discovery**. A monitor absent from generated configuration usually means the first gate failed, the Operator rejected it, or reconciliation failed. A present job with no discovered targets points to target namespace, Service, port, endpoint, relabeling, or discovery RBAC problems. An active but down target means discovery succeeded and the scrape itself is failing.

## Prometheus Operator and kube-prometheus-stack

The fields shown above are Prometheus Operator CRD fields. kube-prometheus-stack exposes Helm values that render them and may add release-label defaults. The chart does not change the Operator's runtime selector semantics. Use:

```bash
kubectl get prometheus platform -n monitoring -o yaml
```

as the final authority for what the chart installed.

## Official Documentation

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Prometheus Operator CLI reference](https://prometheus-operator.dev/docs/platform/operator/)
- [Prometheus configuration and Kubernetes discovery](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Conclusion

Cross-namespace monitoring succeeds only when Prometheus selects the monitor's namespace, the ServiceMonitor selects the target Service namespaces, and Prometheus has discovery RBAC in those namespaces. Configure and test each gate separately, respect `ignoreNamespaceSelectors`, and diagnose the rendered Prometheus resource rather than assuming Helm values became the intended CRD fields.

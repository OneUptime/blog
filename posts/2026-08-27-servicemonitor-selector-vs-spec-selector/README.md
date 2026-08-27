# `serviceMonitorSelector` vs `spec.selector`: Which Labels Must a ServiceMonitor Match?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes, Label Selectors, Observability

Description: Separate the Prometheus selector that chooses ServiceMonitors from the ServiceMonitor selector that chooses Kubernetes Services.

---

`serviceMonitorSelector` and `ServiceMonitor.spec.selector` both use Kubernetes label-selector syntax, but they select different kinds of objects at different stages.

| Field | Lives on | Selects | Labels evaluated |
| --- | --- | --- | --- |
| `spec.serviceMonitorSelector` | `Prometheus` | `ServiceMonitor` objects | `ServiceMonitor.metadata.labels` |
| `spec.serviceMonitorNamespaceSelector` | `Prometheus` | namespaces containing monitors | `Namespace.metadata.labels` |
| `spec.selector` | `ServiceMonitor` | Services and their endpoint data | `Service.metadata.labels` |
| `spec.namespaceSelector` | `ServiceMonitor` | namespaces containing target Services | explicit namespace names or all namespaces |

No single label needs to appear on every object. Labels are contracts between adjacent selection stages.

## A Complete Example

This Prometheus resource selects monitors labeled `monitoring-instance: platform`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: platform
  namespace: monitoring
spec:
  serviceMonitorSelector:
    matchLabels:
      monitoring-instance: platform
  serviceMonitorNamespaceSelector:
    matchLabels:
      allow-platform-monitoring: "true"
```

The namespace containing a monitor needs the namespace label:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: observability-config
  labels:
    allow-platform-monitoring: "true"
```

The ServiceMonitor then needs the object label selected by Prometheus. Its own `spec.selector` is a different selector for the application Service:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: checkout
  namespace: observability-config
  labels:
    monitoring-instance: platform
spec:
  namespaceSelector:
    matchNames:
      - production
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
  endpoints:
    - port: metrics
```

Finally, the target Service needs the application label and named port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: production
  labels:
    app.kubernetes.io/name: checkout
spec:
  selector:
    app.kubernetes.io/name: checkout
  ports:
    - name: metrics
      port: 9090
      targetPort: metrics
```

The `monitoring-instance` label need not be on the Service. The `app.kubernetes.io/name` label need not be on the ServiceMonitor. Adding every label everywhere can hide the model and create accidental matches.

## Read Selectors from the Outside In

Start with the live Prometheus resource:

```bash
kubectl get prometheus platform -n monitoring \
  -o jsonpath='{.spec.serviceMonitorSelector}{"\n"}{.spec.serviceMonitorNamespaceSelector}{"\n"}'
```

Apply the object selector to ServiceMonitors in a candidate namespace:

```bash
kubectl get servicemonitor -n observability-config \
  -l monitoring-instance=platform \
  --show-labels
```

Then read the selected monitor and apply its selector to Services in the namespace it targets:

```bash
kubectl get servicemonitor checkout -n observability-config -o yaml
kubectl get service -n production \
  -l app.kubernetes.io/name=checkout \
  --show-labels
```

This mirrors what the Operator and Prometheus do. Querying Pods with the ServiceMonitor selector skips the Service boundary and can produce a misleading match.

## Null, Empty, and Omitted Are Not Synonyms

For the Prometheus API:

```yaml
spec:
  serviceMonitorSelector: {}
```

An empty selector matches all ServiceMonitor objects in the namespaces allowed by `serviceMonitorNamespaceSelector`.

By contrast, a null or omitted `serviceMonitorSelector` matches no ServiceMonitors. If all four scrape-object selectors are null, the current API describes a deprecated unmanaged configuration mode. Make intent explicit rather than relying on omission.

Namespace selection has different null behavior:

- `serviceMonitorNamespaceSelector: {}` matches all namespaces;
- null selects only the Prometheus object's namespace.

On a ServiceMonitor, `spec.selector` is required. An empty selector can match every eligible Service, which is usually too broad. `spec.namespaceSelector` defaults to the ServiceMonitor's own namespace; `any: true` selects all namespaces and takes precedence over `matchNames`.

Helm values add another serialization layer. kube-prometheus-stack settings can decide whether a nil value is rendered as a release-label selector. Those settings are not CRD semantics. Inspect the resulting `Prometheus` YAML before reasoning about selection.

## Prefer Stable Ownership Labels

Use a stable label to associate monitors with a Prometheus instance or team:

```yaml
metadata:
  labels:
    monitoring-instance: platform
```

Use application identity labels on Services:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: checkout
    app.kubernetes.io/component: api
```

Avoid selecting on mutable rollout labels such as a Pod template hash. Also avoid using the Helm release label unless binding the monitor to that release is intentional. A monitor installed by a different chart can be valid even when it does not share the Prometheus chart's release name.

## Official Documentation

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator design](https://prometheus-operator.dev/docs/getting-started/design/)
- [Prometheus Operator troubleshooting selector flow](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Kubernetes labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [kube-prometheus-stack chart values](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml)

## Conclusion

`serviceMonitorSelector` answers "which ServiceMonitor objects belong to this Prometheus?" `ServiceMonitor.spec.selector` answers "which Services should this monitor scrape?" Connect the two stages with separate, stable label contracts and verify namespace selectors independently. The live Prometheus CR, not an unrendered Helm value, determines the first match.

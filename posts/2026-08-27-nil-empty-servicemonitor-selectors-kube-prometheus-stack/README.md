# Nil vs Empty ServiceMonitor Selectors in kube-prometheus-stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, Kube-prometheus-stack, Helm

Description: Understand API-level null and empty selector semantics, Helm rendering, namespace scope, and the three selectors in a ServiceMonitor path.

---

For Prometheus Operator selectors, a missing value and an empty object are intentionally different. Helm adds another layer because kube-prometheus-stack can translate an empty value into release-label matching before the Prometheus custom resource reaches the API server.

Debug the rendered and live `Prometheus` object, not the values file in isolation.

## The Operator's Selector Rules

On a Prometheus or PrometheusAgent resource, these two fields answer different questions:

- `spec.serviceMonitorSelector` selects ServiceMonitor objects by their labels.
- `spec.serviceMonitorNamespaceSelector` selects namespaces in which to look for those objects.

Their null and empty semantics are:

| Field value | `serviceMonitorSelector` | `serviceMonitorNamespaceSelector` |
| --- | --- | --- |
| field omitted or null | select no ServiceMonitor objects | search only the Prometheus resource's namespace |
| `{}` | select all ServiceMonitor objects | search all namespaces |
| non-empty selector | match those object labels | match those namespace labels |

There is one additional edge case for a `Prometheus` resource. Unless the Operator disables its deprecated unmanaged-configuration support, if `serviceMonitorSelector`, `podMonitorSelector`, `probeSelector`, and `scrapeConfigSelector` are all null, the Prometheus configuration is unmanaged. The Operator creates the configuration Secret but expects the user to provide its content. This unmanaged behavior is deprecated, so do not use four omitted selectors as a way to mean "select everything."

## kube-prometheus-stack Can Render a Different Selector

kube-prometheus-stack is a Helm chart that templates the Prometheus object. In chart templates that expose `serviceMonitorSelectorNilUsesHelmValues`, an empty or nil selector with that switch enabled is rendered as a selector for labels derived from the Helm release. A ServiceMonitor created by another chart often lacks that release label, so it is valid in Kubernetes but never selected.

Chart behavior has changed across releases. Chart 63.x temporarily deprecated the `*SelectorNilUsesHelmValues` pattern and documented `matchLabels: null` as a way to render an API-level empty selector. Chart 64.x reverted the 63.x release, and later releases again expose the `*SelectorNilUsesHelmValues` switches. Pin the chart version and inspect its matching `values.yaml`, template, and upgrade notes rather than relying on advice for a different major version.

Set `PINNED_CHART_VERSION` to the chart version you deploy, then render before installation:

```bash
helm template monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --version "${PINNED_CHART_VERSION:?set PINNED_CHART_VERSION}" \
  -f values.yaml \
  | sed -n '/^kind: Prometheus$/,/^---$/p'
```

Then inspect what the API server actually stored:

```bash
kubectl get prometheus -n monitoring -o yaml
```

The live `.spec.serviceMonitorSelector` is the source of truth for the Operator.

## Configure an Explicit Scope

For a label-scoped installation, make the intended labels explicit:

```yaml
prometheus:
  prometheusSpec:
    serviceMonitorSelector:
      matchLabels:
        monitoring: platform
    serviceMonitorNamespaceSelector:
      matchLabels:
        observability: enabled
```

Every desired ServiceMonitor needs `metadata.labels.monitoring: platform`, and every namespace containing one needs `metadata.labels.observability: enabled`.

If the security model permits one Prometheus instance to select all ServiceMonitors in all namespaces, the desired live custom resource is:

```yaml
spec:
  serviceMonitorSelector: {}
  serviceMonitorNamespaceSelector: {}
```

Express that through the values syntax documented for the pinned chart release, then verify that the rendered object contains exactly those fields. In chart 63.x, the upgrade notes documented this value shape to render a non-null, API-empty resource selector:

```yaml
prometheus:
  prometheusSpec:
    serviceMonitorSelector:
      matchLabels: null
    serviceMonitorNamespaceSelector: {}
```

In releases that expose `serviceMonitorSelectorNilUsesHelmValues`, set it to `false` and set `serviceMonitorSelector: {}` instead.

Do not broaden both selectors only to make a target appear. The Operator must be configured and authorized to watch the namespaces containing the ServiceMonitor objects. Cross-namespace target discovery separately requires the Prometheus service account to read Services and Pods in the target namespaces, plus Endpoints or EndpointSlices for the configured discovery role.

## Do Not Confuse the Three Selection Boundaries

Before Kubernetes resolves each Service to backing endpoints, the Prometheus-to-ServiceMonitor-to-Service path has three label-selection boundaries:

1. `Prometheus.spec.serviceMonitorNamespaceSelector` chooses namespaces containing ServiceMonitor objects.
2. `Prometheus.spec.serviceMonitorSelector` chooses the ServiceMonitor objects in those namespaces.
3. `ServiceMonitor.spec.selector` chooses Kubernetes Services to scrape, with the ServiceMonitor's own namespace selector controlling where those Services are searched.

Changing the third selector cannot make Prometheus select the ServiceMonitor. Changing the first two cannot fix a ServiceMonitor that selects no Service or refers to a missing named port.

Probe and ScrapeConfig are independent configuration resources. They use `probeSelector` or `scrapeConfigSelector`, not `serviceMonitorSelector`, even when all three ultimately configure the same Prometheus instance.

## Diagnose a Missing Target

Print the actual selectors and candidate labels side by side:

```bash
kubectl get prometheus -n monitoring \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.serviceMonitorSelector}{"\n"}{end}'
kubectl get prometheus -n monitoring \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.serviceMonitorNamespaceSelector}{"\n"}{end}'
kubectl get servicemonitor -A --show-labels
kubectl get namespace --show-labels
```

For one known Prometheus resource, use its name rather than `.items`:

```bash
kubectl get prometheus platform -n monitoring \
  -o jsonpath='{.spec.serviceMonitorSelector}{"\n"}{.spec.serviceMonitorNamespaceSelector}{"\n"}'
```

Finally, decode and decompress `prometheus.yaml.gz` from the generated `prometheus-<Prometheus-name>` Secret before searching it. If the ServiceMonitor name is absent, continue debugging object selection or an Operator rejection Event. If it is present, move to Service selection, Endpoints or EndpointSlice RBAC for the effective discovery role, named ports, and target health.

## Official Documentation

- [Prometheus Operator selector semantics](https://prometheus-operator.dev/docs/getting-started/design/#resource-selectors)
- [Prometheus Operator API reference for Prometheus selectors](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusSpec)
- [kube-prometheus-stack values](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml)
- [kube-prometheus-stack Prometheus template](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/prometheus.yaml)
- [kube-prometheus-stack upgrade notes](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/UPGRADE.md)
- [Kubernetes label selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)

## Conclusion

At the Operator API, null selects no ServiceMonitors while `{}` selects all; namespace-selector null means the local namespace while `{}` means all namespaces. kube-prometheus-stack may rewrite empty Helm values into release-label selectors, so inspect the pinned chart template and the live Prometheus custom resource before changing labels or scope.

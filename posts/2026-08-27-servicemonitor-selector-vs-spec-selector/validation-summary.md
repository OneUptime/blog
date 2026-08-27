# Validation Summary: `serviceMonitorSelector` vs `spec.selector` Labels

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Prometheus
- Prometheus Operator
- `Prometheus` and `ServiceMonitor` custom resources
- Kubernetes Services, Namespaces, Endpoints, and EndpointSlices
- Kubernetes labels and label selectors
- `kubectl` and JSONPath output
- Helm and kube-prometheus-stack

## Sources Consulted

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator design](https://prometheus-operator.dev/docs/getting-started/design/)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes)
- [Prometheus Operator ServiceMonitor CRD](https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml)
- [Prometheus Operator Prometheus CRD](https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_prometheuses.yaml)
- [Prometheus Operator selector-generation source](https://github.com/prometheus-operator/prometheus-operator/blob/main/pkg/prometheus/promcfg.go)
- [Kubernetes LabelSelector API reference](https://kubernetes.io/docs/reference/kubernetes-api/definitions/label-selector-v1-meta/)
- [Kubernetes labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlice documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kube-prometheus-stack values](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml)
- [kube-prometheus-stack Prometheus template](https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/prometheus/prometheus.yaml)

## Issues Found

No technical issues found.

## Review Notes

- All YAML snippets parsed successfully. The `ServiceMonitor` includes the currently required `spec.selector` and `spec.endpoints` fields, and `endpoints[].port: metrics` correctly refers to the named Service port.
- All `kubectl` commands, flags, resource names, label selectors, and JSONPath expressions are current and syntactically valid.
- A ServiceMonitor ultimately discovers target data through Endpoints or EndpointSlices. For the normal Service-backed flow shown in the post, its selector is applied to Service metadata labels, so the post's Service-centric explanation is accurate.
- The example assumes that matching backend Pods already exist, carry `app.kubernetes.io/name: checkout`, and expose a container port named `metrics` for the Service's named `targetPort`. Cross-namespace discovery also assumes the relevant Operator and Prometheus service accounts have suitable RBAC. These are deployment prerequisites, not errors in the selector example.
- Current kube-prometheus-stack templates can turn a nil or empty ServiceMonitor selector into a Helm release-label selector when `serviceMonitorSelectorNilUsesHelmValues` is enabled, confirming the post's warning to inspect rendered Prometheus resources.

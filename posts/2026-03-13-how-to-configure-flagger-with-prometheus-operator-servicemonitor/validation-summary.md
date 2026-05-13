# Validation Summary: How to Configure Flagger with Prometheus Operator ServiceMonitor

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flagger
- Prometheus Operator
- ServiceMonitor and PodMonitor custom resources
- Kubernetes Services and Deployments
- kube-prometheus-stack Helm chart
- NGINX Ingress Controller metrics
- Istio Envoy metrics

## Sources Consulted
- Flagger "How it works" documentation: https://fluxcd.io/flagger/usage/how-it-works/
- Flagger FAQ, Kubernetes services and label selectors: https://fluxcd.io/flagger/faq/
- Flagger monitoring documentation: https://fluxcd.io/flagger/usage/monitoring/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator troubleshooting guide: https://prometheus-operator.dev/docs/platform/troubleshooting/
- kube-prometheus-stack chart values and README: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- Istio secure metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Flagger source code for generated service labels and metrics: https://github.com/fluxcd/flagger

## Issues Found
- The post said Flagger creates primary and canary services with corresponding Deployments. Flagger creates the primary Deployment and keeps the original target workload as the canary workload, so the wording was corrected.
- The application ServiceMonitor selected `app: podinfo`, which would only match the generated apex service metadata label in Flagger's default Kubernetes router. The ServiceMonitor now uses a `matchExpressions` selector for `podinfo`, `podinfo-primary`, and `podinfo-canary`.
- The verification command used `kubectl get svc -l app=podinfo`, which would not show all three generated services. It now uses the matching Kubernetes label-selector expression.
- The verification PromQL query used `up{job="podinfo"}` even though, without `jobLabel`, ServiceMonitor targets default their `job` label to the Service name. It now queries all three service jobs.
- The kube-prometheus-stack values were described as configuring a shorter Prometheus Operator resync period. Those values control whether nil or empty selectors use Helm release labels, so the explanation was corrected.
- The post said `serviceMonitorSelectorNilUsesHelmValues: false` discovers all ServiceMonitors regardless of labels without qualification. The wording now notes that namespace selection still applies.

## Review Notes
The NGINX and Istio monitoring snippets are plausible examples but remain environment-dependent because chart labels, port names, and mesh metrics behavior can vary by installation. The post now avoids the main incorrect assumptions while preserving the original scope and structure.

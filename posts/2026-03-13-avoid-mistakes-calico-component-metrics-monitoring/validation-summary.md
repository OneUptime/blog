# Validation Summary: How to Avoid Common Mistakes with Calico Component Metrics Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Prometheus
- Prometheus Operator
- ServiceMonitor custom resources
- PromQL
- kubectl
- curl
- jq

## Sources Consulted
- Calico documentation: Monitor Calico component metrics, including Felix metrics enablement and the `k8s-app: calico-node` Service pod selector: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator documentation: Design overview for ServiceMonitor, Service, and Prometheus selector behavior: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator documentation: Troubleshooting ServiceMonitor selection and missing Service targets: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Prometheus Operator documentation: Getting started example showing ServiceMonitor `spec.selector` selecting Service metadata labels and Prometheus `spec.serviceMonitorSelector` selecting ServiceMonitor labels: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference for `serviceMonitorSelector`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus documentation: Configuration reference for scrape intervals: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus documentation: HTTP API query endpoint and URL-encoded query parameters: https://prometheus.io/docs/prometheus/3.9/querying/api/
- Kubernetes documentation: `kubectl get` command and `--no-headers` / `-o jsonpath` options: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The ServiceMonitor selector example used `k8s-app: calico-node` as if `spec.selector.matchLabels` matched the Calico Service's pod selector. Prometheus Operator ServiceMonitors select Service objects by Service metadata labels; the Service then selects pods through its own `spec.selector`. Changed the example to emphasize checking Service metadata labels and matching a Service label such as `app: felix-metrics`.
- The Prometheus API validation command used invalid PromQL syntax, `up{...}=1`, and embedded an unencoded PromQL query directly in the URL. Changed it to use `== 1` and `curl -G --data-urlencode`, matching Prometheus HTTP API usage.
- The post stated that Prometheus will not automatically discover a Service created after an existing ServiceMonitor. Prometheus Operator/Kubernetes service discovery can pick it up after reconciliation/service-discovery refresh. Changed the wording to say applying the Service first avoids temporary empty targets during rollout.

## Review Notes
- The coverage comparison assumes the selected Felix metrics job corresponds to every expected node. Mixed Linux/Windows clusters or custom Calico deployments may require separate jobs or adjusted selectors.
- `count(kube_node_info)` depends on kube-state-metrics being scraped by the same Prometheus.
- The `job` label value in the examples is deployment-specific and should be adjusted to match the generated Prometheus scrape configuration.

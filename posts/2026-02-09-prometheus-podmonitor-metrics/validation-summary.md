# Validation Summary: How to Implement Prometheus PodMonitor for Pod-Level Metrics Collection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus
- Prometheus Operator
- Kubernetes
- PodMonitor custom resources
- ServiceMonitor custom resources
- Kubernetes YAML manifests
- kubectl
- Prometheus relabeling and metric relabeling
- TLS and basic authentication for scrape endpoints

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration reference, Kubernetes service discovery meta labels and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl reference and output formats: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described ServiceMonitor as aggregating metrics across multiple pods and contrasted that with PodMonitor providing per-replica metrics. ServiceMonitor discovers service-backed endpoints and Prometheus still scrapes endpoint targets; it does not inherently aggregate samples. Updated the wording to say ServiceMonitor discovers metrics through a Service and its backing endpoints, and that PodMonitor is useful when direct pod metrics are needed without relying on a Service.
- The "When to Use PodMonitor" list suggested collecting metrics from init containers. Prometheus Kubernetes pod discovery exposes init-container metadata, but init containers are not long-running scrape targets after pod initialization. Updated the guidance to reference sidecar containers only.
- The cross-namespace example included a commented `namespaceSelector.matchLabels` option. Prometheus Operator's `NamespaceSelector` supports `matchNames` and `any`, not label-based namespace selection. Replaced the commented example with `any: true`.
- The job-monitoring section implied PodMonitor could generally monitor batch and CronJob pods. PodMonitor can scrape them while the pods are running, but completed pods are not reliable scrape targets. Updated the section heading text to state "while their pods are running."

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI checks were performed against the official Kubernetes command reference instead of local `kubectl --help` output.
- The PodMonitor examples use current `monitoring.coreos.com/v1` fields such as `podMetricsEndpoints`, `port`, `interval`, `path`, `relabelings`, `metricRelabelings`, `tlsConfig`, `basicAuth`, `namespaceSelector.matchNames`, `scrapeTimeout`, `params`, `honorLabels`, `honorTimestamps`, and `followRedirects`.

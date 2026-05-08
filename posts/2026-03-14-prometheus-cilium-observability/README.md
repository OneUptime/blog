# How to Use Prometheus for Cilium Observability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Prometheus, Observability, Kubernetes, Monitoring

Description: Learn how to integrate Prometheus with Cilium to collect and visualize network metrics, enabling deep observability into your Kubernetes cluster's networking layer.

---

## Introduction

Cilium provides eBPF-based networking, security, and observability for Kubernetes clusters. One of its most powerful features is the ability to expose detailed metrics about network flows, policy enforcement, and datapath performance. Prometheus, the de facto standard for monitoring in Kubernetes environments, is the ideal tool to scrape and store these metrics.

By integrating Prometheus with Cilium, you gain visibility into packet drops, policy verdicts, connection tracking table sizes, endpoint health, and much more. This data is invaluable for debugging connectivity issues, capacity planning, and ensuring that your network policies are working as intended.

In this guide, you will learn how to enable Cilium metrics, configure Prometheus to scrape them, and set up Grafana dashboards to visualize the data. We will use real Helm values and CLI commands that work with Cilium 1.15 and later.

## Prerequisites

- A running Kubernetes cluster (v1.24 or later)
- Helm 3 installed
- kubectl configured to access your cluster
- Basic familiarity with Prometheus and Grafana
- Cilium installed (or ready to install) via Helm

## Enabling Cilium Metrics with Helm

Cilium exposes metrics through its agent and operator components. You need to enable the Prometheus metrics endpoint in your Helm values.

Create or update your Cilium Helm values file:

```yaml
# cilium-values.yaml

prometheus:
  enabled: true
  serviceMonitor:
    enabled: true
    labels:
      release: prometheus  # Must match your Prometheus operator's label selector

operator:
  prometheus:
    enabled: true
    serviceMonitor:
      enabled: true
      labels:
        release: prometheus

hubble:
  enabled: true
  metrics:
    enableOpenMetrics: true
    enabled:
      - dns:query
      - drop
      - tcp
      - flow
      - port-distribution
      - icmp
      - httpV2:exemplars=true;labelsContext=source_ip,source_namespace,source_workload,destination_ip,destination_namespace,destination_workload,traffic_direction
    serviceMonitor:
      enabled: true
      labels:
        release: prometheus
```

Install or upgrade Cilium with these values:

```bash
helm repo add cilium https://helm.cilium.io/
helm repo update

# For a fresh install
helm install cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --values cilium-values.yaml

# For an upgrade
helm upgrade cilium cilium/cilium --version 1.15.0 \
  --namespace kube-system \
  --values cilium-values.yaml
```

Verify that the metrics endpoints are available:

```bash
# Check cilium-agent metrics
kubectl -n kube-system get svc cilium-agent -o wide

# Port-forward to test locally
kubectl -n kube-system port-forward svc/cilium-agent 9962:9962 &
curl -s http://localhost:9962/metrics | head -20
```

## Configuring Prometheus to Scrape Cilium Metrics

If you are using the Prometheus Operator (kube-prometheus-stack), the ServiceMonitor resources created by Cilium's Helm chart will automatically configure scraping. Verify the ServiceMonitors exist:

```bash
kubectl get servicemonitors -n kube-system -l app.kubernetes.io/part-of=cilium
```

You should see output similar to:

```text
NAME              AGE
cilium-agent      2m
cilium-operator   2m
hubble            2m
```

If you are running Prometheus without the operator, leave the ServiceMonitor values disabled and add scrape configs manually. Cilium agent metrics are exposed through pod annotations, and Hubble metrics are exposed through the `hubble-metrics` headless service:

```yaml
# prometheus-additional-scrape-configs.yaml
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
    - role: pod
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: ${1}:${2}
      target_label: __address__

- job_name: 'kubernetes-endpoints'
  scrape_interval: 30s
  kubernetes_sd_configs:
    - role: endpoints
  relabel_configs:
    - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
      action: replace
      target_label: __address__
      regex: (.+)(?::\d+);(\d+)
      replacement: $1:$2
```

## Key Cilium Metrics to Monitor

Once Prometheus is scraping, these are the most important metrics to track:

```mermaid
graph TD
    A[Cilium Metrics] --> B[Agent Metrics :9962]
    A --> C[Hubble Metrics :9965]
    A --> D[Operator Metrics :9963]
    B --> B1[cilium_endpoint_state]
    B --> B2[cilium_policy_l7_total]
    B --> B3[cilium_drop_count_total]
    B --> B4[cilium_forward_count_total]
    C --> C1[hubble_flows_processed_total]
    C --> C2[hubble_dns_queries_total]
    C --> C3[hubble_tcp_flags_total]
    D --> D1[cilium_operator_ipam_ip_allocation_ops]
```

Useful PromQL queries to get started:

```bash
# Rate of dropped packets by reason
rate(cilium_drop_count_total[5m])

# Hubble flow verdict breakdown
sum by (verdict) (rate(hubble_flows_processed_total[5m]))

# Endpoint state per node
sum by (node, state) (cilium_endpoint_state)

# DNS query rate by destination
sum by (query) (rate(hubble_dns_queries_total[5m]))

# HTTP request rate by response code (requires httpV2 metric)
sum by (status) (rate(hubble_http_requests_total[5m]))
```

## Setting Up Grafana Dashboards

Cilium provides official Grafana dashboards. Import them into your Grafana instance:

```bash
# Download official Cilium dashboards
curl -sL https://raw.githubusercontent.com/cilium/cilium/main/install/kubernetes/cilium/files/cilium-agent/dashboards/cilium-dashboard.json \
  -o cilium-dashboard.json

# If using Grafana Operator, create a ConfigMap
kubectl create configmap cilium-grafana-dashboard \
  --from-file=cilium-dashboard.json \
  -n monitoring

kubectl label configmap cilium-grafana-dashboard \
  grafana_dashboard=1 \
  -n monitoring
```

Alternatively, use the Grafana dashboard IDs directly in the Grafana UI:

- Cilium Agent: Dashboard ID `16611`
- Cilium Operator: Dashboard ID `16612`
- Hubble: Dashboard ID `16613`

## Verification

Confirm that everything is working end to end:

```bash
# 1. Check Cilium agent is exposing metrics
cilium status --brief

# 2. Verify Prometheus targets are healthy
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool | grep cilium

# 3. Run a test query
curl -s 'http://localhost:9090/api/v1/query?query=cilium_endpoint_state' | python3 -m json.tool

# 4. Check Hubble metrics specifically
kubectl -n kube-system get svc hubble-metrics -o wide
kubectl -n kube-system exec ds/cilium -- cilium-dbg metrics list | grep hubble
```

## Troubleshooting

- **No metrics appearing in Prometheus**: Verify the ServiceMonitor labels match your Prometheus operator's `serviceMonitorSelector`. Check with `kubectl get prometheus -n monitoring -o yaml | grep -A5 serviceMonitorSelector`.

- **Hubble metrics missing**: Ensure Hubble is enabled and `hubble.metrics.enabled` is not empty. Check that the metrics service exists with `kubectl -n kube-system get svc hubble-metrics`.

- **Partial metrics**: Some metrics like `httpV2` require L7 visibility. Ensure you have L7 proxy support enabled and a CiliumNetworkPolicy with L7 rules applied.

- **High cardinality warnings**: Be careful with labels like `source_ip` and `destination_ip` in Hubble metrics. These can cause high cardinality. Use `labelsContext` selectively.

- **Stale targets**: If Cilium pods restart, Prometheus may show stale targets temporarily. This resolves within the scrape interval (default 15s for ServiceMonitor).

## Conclusion

Integrating Prometheus with Cilium gives you comprehensive observability into your Kubernetes networking stack. By enabling metrics on the Cilium agent, Hubble, and the operator, you can monitor packet drops, policy verdicts, DNS queries, HTTP traffic, and more. Combined with Grafana dashboards, this setup provides actionable insights for maintaining a healthy and secure cluster. Regularly review your PromQL alerts and dashboard panels to catch networking anomalies before they impact your workloads.

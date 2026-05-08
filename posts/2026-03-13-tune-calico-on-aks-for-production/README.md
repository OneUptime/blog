# How to Tune Calico on AKS for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, AKS, Azure

Description: Apply production-grade Calico tuning on Azure Kubernetes Service for optimal policy enforcement performance.

---

## Introduction

Calico on AKS operates in policy-only mode, which means tuning focuses on Felix performance rather than IPAM or routing. For production AKS deployments with large numbers of network policies or high workload density, tuning Felix can significantly improve policy enforcement latency and reduce CPU overhead.

AKS-specific tuning considerations include adjusting Felix's iptables refresh interval for the scale of your deployment, enabling Prometheus metrics integration with Azure Monitor, and ensuring that Calico's resource limits are appropriate for the AKS node SKU you are using. Since AKS nodes are managed, some tuning approaches used in self-managed clusters are not applicable.

This guide covers the Felix and node-level Calico tuning options available on AKS, with specific recommendations for production workloads.

## Prerequisites

- AKS cluster with Calico network policies in production
- kubectl with AKS cluster credentials
- Azure Monitor workspace (optional, for metrics)

## Step 1: Assess Current Performance

Check Felix resource consumption on nodes:

```bash
kubectl top pods -n kube-system -l k8s-app=calico-node
kubectl describe pods -n kube-system -l k8s-app=calico-node | grep -A5 Limits
```

## Step 2: Check Number of Network Policies

```bash
kubectl get networkpolicy --all-namespaces | wc -l
```

For clusters with hundreds of policies, iptables refresh rate tuning is important.

## Step 3: Tune Felix for Production Scale

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  iptablesRefreshInterval: 90s
  routeRefreshInterval: 90s
  healthEnabled: true
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
  reportingInterval: 30s
EOF
```

## Step 4: Set Resource Limits for AKS Node SKU

For Standard_D4s_v3 (4 vCPU, 16GB RAM) nodes:

```bash
kubectl patch daemonset calico-node -n kube-system --type=json -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/resources","value":{
    "requests":{"cpu":"150m","memory":"128Mi"},
    "limits":{"cpu":"500m","memory":"512Mi"}
  }}
]'
```

## Step 5: Enable Azure Monitor Integration for Calico Metrics

Create a custom Prometheus scrape ConfigMap for Azure Monitor:

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: ama-metrics-prometheus-config
  namespace: kube-system
data:
  prometheus-config: |-
    global:
      scrape_interval: 30s
    scrape_configs:
    - job_name: calico-felix
      scheme: http
      metrics_path: /metrics
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        action: keep
        regex: kube-system
      - source_labels: [__meta_kubernetes_pod_label_k8s_app]
        action: keep
        regex: calico-node
      - source_labels: [__meta_kubernetes_pod_phase]
        action: keep
        regex: Running
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: ${1}:9091
      metric_relabel_configs:
      - source_labels: [__name__]
        action: keep
        regex: 'felix_active_local_endpoints|felix_iptables_rules'
EOF
```

## Step 6: Configure Calico for High-Scale AKS

For AKS clusters with 100+ nodes:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  iptablesRefreshInterval: 180s
  ipsetsRefreshInterval: 180s
  routeRefreshInterval: 180s
  iptablesPostWriteCheckInterval: 1s
EOF
```

## Step 7: Verify Tuning

```bash
calicoctl get felixconfig default -o yaml
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
```

## Conclusion

You have applied production-grade Calico tuning on AKS by optimizing Felix iptables refresh intervals, setting appropriate resource limits for your node SKU, and integrating with Azure Monitor for metrics. These settings ensure that Calico's policy enforcement remains performant and observable at production scale on AKS.

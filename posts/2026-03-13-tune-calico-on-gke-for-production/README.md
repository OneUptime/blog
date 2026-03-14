# How to Tune Calico on GKE for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, GKE, Google Cloud

Description: Apply production-grade Calico tuning on Google Kubernetes Engine for optimal policy enforcement at scale.

---

## Introduction

Calico on GKE in policy-only mode requires tuning Felix for production workload volumes. GKE clusters can scale to hundreds of nodes, and at this scale, Felix's iptables management overhead needs to be optimized. GKE's node pool auto-scaling also means Calico must handle nodes being added and removed frequently, making the refresh intervals and health monitoring settings especially important.

GKE supports both standard nodes (Container-Optimized OS with iptables) and nodes with eBPF support (select kernel versions). For high-performance production workloads, enabling eBPF via the Tigera Operator can significantly reduce policy enforcement latency and CPU overhead compared to iptables.

## Prerequisites

- GKE cluster with Calico in production
- kubectl configured for GKE
- calicoctl installed
- Google Cloud Monitoring for metrics (optional)

## Step 1: Check GKE Node OS and Kernel

```bash
kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.osImage}'
kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.kernelVersion}'
```

Container-Optimized OS on GKE typically supports eBPF with kernel 5.x+.

## Step 2: Enable eBPF for High-Performance Production

Check if eBPF is viable for your GKE version:

```bash
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.kernelVersion}'
```

If kernel is 5.3+, switch to eBPF:

```bash
kubectl patch felixconfiguration default --type merge \
  --patch '{"spec":{"bpfEnabled":true}}'
```

## Step 3: Tune Felix for GKE Production

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
  bpfLogLevel: ""
  ipv6Support: false
EOF
```

## Step 4: Configure Resource Limits for GKE Node Types

For `n1-standard-4` (4 vCPU, 15GB):

```bash
kubectl patch daemonset calico-node -n kube-system --type=json -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/resources","value":{
    "requests":{"cpu":"150m","memory":"128Mi"},
    "limits":{"cpu":"500m","memory":"512Mi"}
  }}
]'
```

## Step 5: Create Felix Metrics Service

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics
  namespace: kube-system
spec:
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    targetPort: 9091
  type: ClusterIP
EOF
```

## Step 6: Set Up Google Cloud Monitoring Integration

For GKE with Google Cloud Monitoring, use the Managed Prometheus scraping:

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: calico-node-metrics
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  endpoints:
  - port: 9091
    interval: 30s
EOF
```

## Step 7: Tune for GKE Auto-Scaling

For clusters with node auto-scaling:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesRefreshInterval":"60s","routeRefreshInterval":"60s"}}'
```

Shorter intervals help Calico react faster to auto-scaling events.

## Step 8: Verify and Restart

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
calicoctl get felixconfiguration default -o yaml
```

## Conclusion

You have applied production-grade Calico tuning on GKE, including eBPF data plane configuration for high-performance workloads, Felix iptables refresh optimization, resource limits, Prometheus metrics, and Google Cloud Monitoring integration. These settings ensure that Calico performs reliably at production scale on GKE including auto-scaling environments.

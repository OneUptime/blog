# How to Tune Calico on GKE for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, GKE, Google Cloud

Description: Apply production-grade Calico tuning on Google Kubernetes Engine for optimal policy enforcement at scale.

---

## Introduction

Calico on GKE in policy-only mode requires tuning Felix for production workload volumes. GKE clusters can scale to hundreds of nodes, and at this scale, Felix's iptables management overhead needs to be optimized. GKE's node pool auto-scaling also means Calico must handle nodes being added and removed frequently, making the refresh intervals and health monitoring settings especially important.

GKE's legacy dataplane uses Calico with iptables for Kubernetes NetworkPolicy enforcement. For high-performance production workloads that need an eBPF-based dataplane, use GKE Dataplane V2, which is implemented with Cilium and is selected at cluster creation time rather than enabled by patching Calico Felix.

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

Container-Optimized OS kernel versions vary by GKE version and node image. Kernel version alone is not enough to switch the managed GKE Calico dataplane to eBPF.

## Step 2: Check Whether You Need GKE Dataplane V2

Check whether the cluster is using legacy Calico policy enforcement:

```bash
kubectl get nodes -l projectcalico.org/ds-ready=true
```

Check whether the cluster is using GKE Dataplane V2:

```bash
kubectl -n kube-system get pods -l k8s-app=cilium
```

If you need eBPF-based policy enforcement on GKE, plan for GKE Dataplane V2 instead of enabling Calico eBPF with a Felix patch on the managed Calico add-on.

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
  healthEnabled: true
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
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
  --patch '{"spec":{"iptablesRefreshInterval":"60s"}}'
```

Shorter refresh intervals can help Felix detect dataplane drift sooner during node churn, at the cost of more frequent reconciliation work.

## Step 8: Verify and Restart

```bash
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
calicoctl get felixconfiguration default -o yaml
```

## Conclusion

You have applied production-grade Calico tuning on GKE, including Felix iptables refresh optimization, resource limits, Prometheus metrics, and Google Cloud Monitoring integration. These settings help Calico perform reliably at production scale on GKE including auto-scaling environments. For eBPF-based policy enforcement on GKE, evaluate GKE Dataplane V2 when creating a cluster.

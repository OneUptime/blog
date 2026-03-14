# How to Tune Calico on EKS for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, EKS, AWS

Description: Apply production-grade Calico tuning on Amazon EKS for optimal policy enforcement performance at scale.

---

## Introduction

Tuning Calico on EKS for production focuses on Felix performance since Calico operates in policy-only mode without IPAM or BGP functions. For large EKS clusters with hundreds of nodes and thousands of network policies, Felix's iptables rule management can become a bottleneck if not properly tuned.

EKS production environments also benefit from Calico's eBPF data plane, which provides better performance than iptables for high-throughput workloads. The eBPF mode is supported on EKS nodes running Linux kernel 5.3+ (available with Amazon Linux 2 with kernel 5.10 or Bottlerocket OS).

This guide covers production tuning for Calico on EKS, including Felix iptables settings, eBPF configuration, resource limits, and CloudWatch metrics integration.

## Prerequisites

- EKS cluster with Calico (production environment)
- kubectl configured for EKS
- calicoctl installed

## Step 1: Assess Cluster Scale

```bash
kubectl get nodes | wc -l
kubectl get networkpolicy --all-namespaces | wc -l
kubectl top pods -n calico-system -l k8s-app=calico-node
```

## Step 2: Enable eBPF Data Plane (Recommended for High-Scale)

Check kernel version on EKS nodes:

```bash
kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.kernelVersion}'
```

If kernel is 5.3+, enable eBPF:

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF"}}}'
```

## Step 3: Tune Felix for Production EKS

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
  iptablesLockTimeout: 30s
  iptablesLockProbeInterval: 50ms
EOF
```

## Step 4: Configure Resource Limits for EKS Node Types

For `m5.xlarge` (4 vCPU, 16GB RAM):

```bash
kubectl patch daemonset calico-node -n calico-system --type=json -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/resources","value":{
    "requests":{"cpu":"150m","memory":"128Mi"},
    "limits":{"cpu":"500m","memory":"512Mi"}
  }}
]'
```

## Step 5: Expose Felix Metrics for CloudWatch

Create a ServiceMonitor for Prometheus scraping:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics
  namespace: calico-system
  labels:
    k8s-app: calico-node
spec:
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    protocol: TCP
  type: ClusterIP
EOF
```

## Step 6: Enable Typha for Large Clusters

Typha reduces kube-apiserver load for clusters with 100+ nodes. It is managed via the Installation CR:

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"typhaAffinity":{"nodeAffinity":{"preferredDuringSchedulingIgnoredDuringExecution":[{"weight":100,"preference":{"matchExpressions":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists"}]}}]}}}}'
```

## Step 7: Verify Production Settings

```bash
calicoctl get felixconfiguration default -o yaml
kubectl get tigerastatus
kubectl top pods -n calico-system
```

## Conclusion

You have applied production-grade Calico tuning on EKS, including eBPF data plane consideration, Felix iptables settings, resource limits, Prometheus metrics, and Typha for large-scale deployments. These settings optimize Calico's policy enforcement performance for production EKS workloads at any scale.

# How to View Kubernetes Cluster Details in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Monitoring, Cluster Management, DevOps

Description: Learn how to view and interpret Kubernetes cluster details, resource summaries, and health information in Portainer.

## Introduction

Portainer's Kubernetes environment dashboard gives you a comprehensive view of your cluster's health, resources, and deployed workloads. From summary tiles to node and namespace views, this centralized view is invaluable for cluster operators. This guide covers navigating the cluster detail views in Portainer.

## Prerequisites

- Portainer with a Kubernetes environment connected
- Admin or operator access

## Step 1: Access the Kubernetes Dashboard

1. Log in to Portainer
2. Click on your Kubernetes environment from the **Home** screen
3. The cluster dashboard loads

## Step 2: Understand the Dashboard Summary

The dashboard summary tiles show key metrics:

```text
Dashboard Summary
──────────────────────────────────────
Namespaces:       12
Applications:     47
Services:         38
Ingresses:        9
Volumes:          24
ConfigMaps:       56
Secrets:          31
Policies:         4
```

## Step 3: View Cluster Nodes

Click **Cluster → Details** to see detailed node information:

```text
NAME        STATUS   ROLES          CPU (Req/Limit)    MEMORY (Req/Limit)
master-01   Ready    control-plane  2.1/4.0 cores      4.2/8.0 GiB
worker-01   Ready    worker         3.2/4.0 cores      5.1/8.0 GiB
worker-02   Ready    worker         2.8/4.0 cores      4.8/8.0 GiB
worker-03   Ready    worker         1.9/4.0 cores      3.7/8.0 GiB
worker-04   Ready    worker         2.2/4.0 cores      4.3/8.0 GiB
```

Click on a node to see:
- Node conditions (Ready, MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable)
- Allocated resources
- Labels and taints
- Applications running on the node

## Step 4: View Cluster Resource Usage

```bash
# View resource usage from kubectl (requires Metrics Server)

kubectl top node

# NAME          CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# worker-01     850m         21%    5120Mi          63%
# worker-02     720m         18%    4896Mi          60%
# worker-03     480m         12%    3840Mi          47%
```

In Portainer, cluster and node usage graphs are available when the metrics API is enabled.

## Step 5: View Kubernetes Version Information

Portainer node details show version-related information such as the kubelet version for each node. On Portainer-provisioned Omni or MicroK8s clusters, cluster version management is also available.

```bash
# CLI equivalent
kubectl version --short
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kubeletVersion}{"\n"}{end}'
```

## Step 6: Check Namespace Overview

Navigate to **Namespaces** for a summary of all namespaces:

```text
NAMESPACE           STATUS   WORKLOADS   CPU REQUEST   MEMORY REQUEST
default             Active   3           150m          256Mi
production          Active   18          4500m         8192Mi
staging             Active   12          2000m         4096Mi
monitoring          Active   8           1500m         3072Mi
kube-system         Active   12          800m          1536Mi
```

## Step 7: View Events for Cluster Health

```bash
# View all recent events
kubectl events --all-namespaces

# View only warnings
kubectl events --all-namespaces --types=Warning
```

In Portainer, open the relevant application or node and use the **Events** tab.

## Step 8: Check Cluster Certificates

```bash
# Check certificate expiry (kubeadm clusters)
kubeadm certs check-expiration

# CERTIFICATE                EXPIRES                  RESIDUAL TIME
# admin.conf                 Apr 24, 2027 10:00 UTC   364d
# apiserver                  Apr 24, 2027 10:00 UTC   364d
# apiserver-etcd-client      Apr 24, 2027 10:00 UTC   364d
# apiserver-kubelet-client   Apr 24, 2027 10:00 UTC   364d
```

## Step 9: Inspect Cluster Configuration

```bash
# View cluster-level API resources
kubectl api-resources

# Check storage classes
kubectl get storageclasses

# View persistent volumes
kubectl get pv
```

In Portainer: navigate to **Volumes** and switch to the **Storage** tab to see storage classes and related volumes visually.

## Step 10: Monitor Control Plane Health

```bash
# Check API server readiness
kubectl get --raw='/readyz?verbose'

# Check API server liveness
kubectl get --raw='/livez?verbose'
```

## Setting Up Cluster Monitoring

For ongoing cluster monitoring, deploy Prometheus + Grafana:

```yaml
# Add to your monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

After deployment, access Grafana dashboards via Portainer by navigating to the monitoring namespace and finding the Grafana service.

## Conclusion

Portainer's Kubernetes dashboard provides a quick overview of cluster health and resource utilization. For day-to-day operations, use the dashboard to spot nodes under stress, identify resource-heavy namespaces, and navigate to specific workloads. For deeper monitoring, complement Portainer with Prometheus and Grafana deployed in the cluster.

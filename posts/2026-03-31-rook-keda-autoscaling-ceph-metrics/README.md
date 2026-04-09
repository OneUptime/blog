# How to Set Up KEDA Horizontal Pod Autoscaling with Rook-Ceph Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, KEDA, Autoscaling, Kubernetes

Description: Configure KEDA to scale Kubernetes workloads horizontally based on Rook-Ceph Prometheus metrics like storage IOPS or queue depth.

---

## Overview

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA to scale workloads based on external metrics. By connecting KEDA to the Prometheus metrics exposed by Rook-Ceph, you can automatically scale storage-intensive workloads in response to actual storage queue depth or IOPS, rather than CPU or memory proxies.

## Prerequisites

- KEDA installed in the cluster
- Prometheus scraping Rook-Ceph metrics
- A Deployment or StatefulSet to scale

Install KEDA:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

## Create a TriggerAuthentication for Prometheus

If Prometheus requires authentication, configure KEDA credentials:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: prometheus-trigger-auth
spec:
  secretTargetRef: []
```

For unauthenticated Prometheus (common in-cluster):

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: storage-worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: storage-worker
  minReplicaCount: 1
  maxReplicaCount: 20
  cooldownPeriod: 300
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-operated.monitoring.svc.cluster.local:9090
      threshold: "50"
      query: sum(ceph_osd_op_wip)
```

## Scale Based on Pool IOPS

Scale a data processing job based on write IOPS to a specific Ceph pool:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pool-iops-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: data-processor
  minReplicaCount: 2
  maxReplicaCount: 30
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-operated.monitoring.svc.cluster.local:9090
      threshold: "1000"
      query: |
        sum(rate(ceph_pool_wr{pool_id="3"}[2m]))
```

## Scale Based on OSD Queue Depth

Scale consumers when OSD operations in progress exceed a threshold:

```yaml
triggers:
- type: prometheus
  metadata:
    serverAddress: http://prometheus-operated.monitoring.svc.cluster.local:9090
    threshold: "100"
    query: max(ceph_osd_op_wip)
    activationThreshold: "5"
```

The `activationThreshold` prevents scaling from zero until queue depth exceeds 5.

## Monitor KEDA Scaling Events

Check ScaledObject status:

```bash
kubectl get scaledobject storage-worker-scaler
kubectl describe scaledobject storage-worker-scaler
```

View HPA created by KEDA:

```bash
kubectl get hpa -l app.kubernetes.io/part-of=storage-worker-scaler
```

Watch scaling events:

```bash
kubectl get events --field-selector reason=ScalingReplicaSet -w
```

## Summary

KEDA enables Rook-Ceph storage metrics to directly drive horizontal pod autoscaling, creating a feedback loop between storage pressure and compute resources. By configuring KEDA ScaledObjects with Prometheus trigger queries targeting Ceph OSD queue depth or pool IOPS, workloads can scale up automatically when storage demand spikes and scale down during quiet periods.

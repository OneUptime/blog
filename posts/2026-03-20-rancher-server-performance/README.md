# How to Optimize Rancher Server Performance - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Performance, Optimization, Server Tuning, Kubernetes

Description: Optimize Rancher server performance through proper resource allocation, database tuning, API rate limiting, and caching configurations for large-scale deployments.

## Introduction

As Rancher deployments grow to manage dozens or hundreds of clusters, server performance becomes critical. This guide covers key optimization techniques including resource sizing, etcd tuning, Rancher controller tuning, and configuration best practices for high-performance Rancher deployments.

## Prerequisites

- Running Rancher installation (v2.12+)
- Access to the Kubernetes cluster hosting Rancher
- Metrics Server and/or a monitoring stack (Prometheus/Grafana) for performance analysis

## Step 1: Right-Size Rancher Server Resources

```yaml
# rancher-values.yaml - Optimized Helm values for Rancher

replicas: 3  # HA deployment

resources:
  requests:
    cpu: 2000m
    memory: 4Gi
  limits:
    cpu: 4000m
    memory: 8Gi
```

## Step 2: Optimize etcd for Rancher's Local Cluster

```yaml
# rke2-config.yaml - Tuned etcd for Rancher's local cluster
# Increase snapshot frequency for faster recovery
etcd-snapshot-schedule-cron: "0 */4 * * *"
etcd-snapshot-retention: 5

# Increase etcd quota and compact old revisions
etcd-arg:
  - "quota-backend-bytes=8589934592"  # 8 GiB
  - "auto-compaction-mode=periodic"
  - "auto-compaction-retention=1h"
```

```bash
# Example: defragment one etcd member; repeat one member at a time
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l component=etcd -o name | head -1) \
  -- env ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key \
  defrag
```

## Step 3: Configure External Datastore for HA K3s (If Used)

```yaml
# k3s-config.yaml - Only if Rancher runs on an HA K3s cluster
# RKE2 HA uses embedded etcd and does not require an external datastore.

datastore-endpoint: "mysql://username:password@tcp(mysql.example.com:3306)/k3s"
```

## Step 4: Reduce Rancher Controller Resync Work

```bash
# If you see CPU spikes every 10 hours, reduce cache-resync handler work
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --reuse-values \
  --set extraEnv[0].name=CATTLE_SYNC_ONLY_CHANGED_OBJECTS \
  --set-string extraEnv[0].value=mgmt,user
```

## Step 5: Configure Horizontal Pod Autoscaler

```yaml
# rancher-hpa.yaml - Scale Rancher pods based on load
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rancher
  namespace: cattle-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rancher
  minReplicas: 3
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
```

## Step 6: Monitor Rancher Server Metrics

```bash
# Check Rancher pod resource usage
kubectl top pods -n cattle-system

RANCHER_POD=$(kubectl get pods -n cattle-system -l app=rancher -o name | head -1)

# Inspect recent Rancher server logs
kubectl logs -n cattle-system "$RANCHER_POD" --since=1h

# Check Rancher audit log activity from the audit sidecar
kubectl logs -n cattle-system "$RANCHER_POD" -c rancher-audit-log --since=1h \
  | jq -r '[.responseCode, .requestURI] | @tsv' \
  | sort | uniq -c | sort -rn | head -20
```

## Step 7: Optimize Cluster Agent Resources

```yaml
# Set baseline requests for cattle-cluster-agent
# Apply this in the managed cluster's Rancher cluster spec
spec:
  clusterAgentDeploymentCustomization:
    overrideResourceRequirements:
      requests:
        cpu: 50m
        memory: 100Mi
```

## Step 8: Configure Rancher Audit Logging

```yaml
# Enable audit logging with low overhead
# rancher-audit-values.yaml
auditLog:
  enabled: true
  destination: sidecar
  level: 0  # 0=metadata only, 1=add headers, 2=add request body, 3=add response body

# For performance, use level 0 in production
# Higher levels are progressively more verbose and add overhead
```

## Conclusion

Optimizing Rancher server performance requires attention to multiple layers: compute resources, etcd health, Rancher controller behavior, and cluster agent sizing. For deployments managing many clusters, proactive monitoring of Rancher's resource usage and API activity is essential for maintaining responsiveness. The key optimization levers are right-sizing Rancher pods, tuning etcd compaction and keyspace limits, reducing scheduled handler executions, and ensuring Rancher and cluster-agent workloads run on nodes with adequate CPU and memory resources.

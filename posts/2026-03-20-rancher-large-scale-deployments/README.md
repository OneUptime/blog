# How to Configure Rancher for Large-Scale Deployments - Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Large Scale, Enterprise, Performance, Kubernetes, Architecture

Description: Configure Rancher for large-scale deployments with hundreds of clusters by tuning server resources, optimizing etcd, enabling external databases, and implementing proper HA.

## Introduction

Running Rancher at large scale-hundreds of downstream clusters, thousands of nodes-requires architectural decisions beyond the default installation. This guide covers the critical configurations needed to maintain Rancher Server stability and performance at enterprise scale.

## Rancher Scalability Guidelines

| Deployment Scale | Clusters | Nodes | Per Upstream Node Resources |
|---|---|---|---|
| Small | Up to 150 | Up to 1500 | 4 CPU, 16GB RAM |
| Medium | Up to 300 | Up to 3000 | 8 CPU, 32GB RAM |
| Large | Up to 500 | Up to 5000 | 16 CPU, 64GB RAM |
| Larger deployments | Custom evaluation | Custom evaluation | Custom evaluation |

## Step 1: Use a Supported HA Datastore for the Management Cluster

Rancher stores its data in the local management cluster's datastore. On RKE2, embedded etcd is the default supported HA datastore. If the management cluster is K3s-based, move production or large deployments off embedded SQLite:

```yaml
# /etc/rancher/k3s/config.yaml
datastore-endpoint: "postgres://<user>:<password>@postgres.databases.svc.cluster.local:5432/k3s"
```

## Step 2: Tune Rancher Reconciliation Loops

If Rancher shows CPU spikes during the scheduled 10-hour cache resync, limit full resync handler execution:

```yaml
extraEnv:
  - name: CATTLE_SYNC_ONLY_CHANGED_OBJECTS
    value: "mgmt,user"
```

## Step 3: Scale etcd for Large Object Counts

When object counts grow, increase etcd keyspace from the default 2 GB and keep compaction enabled:

```yaml
# /etc/rancher/rke2/config.yaml
etcd-arg:
  - "quota-backend-bytes=8589934592"    # 8GB keyspace
  - "auto-compaction-retention=4h"
```

## Step 4: Distribute Load with Multiple Rancher Replicas

```yaml
# rancher-values.yaml
replicas: 3
antiAffinity: required
topologyKey: kubernetes.io/hostname
```

## Step 5: Separate Cluster-Level etcd

For the local Rancher cluster, use dedicated etcd and control-plane nodes when you need separate infrastructure:

```yaml
# /etc/rancher/rke2/config.yaml on etcd-only nodes
# Add the usual HA server/token settings for non-bootstrap nodes.
disable-apiserver: true
disable-controller-manager: true
disable-scheduler: true
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"
---
# /etc/rancher/rke2/config.yaml on control-plane-only nodes
# Add the usual HA server/token settings when joining the cluster.
disable-etcd: true
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"
```

## Step 6: Implement Cluster Registration Rate Limiting

When registering many clusters simultaneously, stagger the Rancher-generated registration manifests:

```bash
# Apply Rancher-generated registration manifests in batches
for manifest in ./registration-manifests/*.yaml; do
  kubectl apply -f "$manifest"
  sleep 10
done
```

## Conclusion

Large-scale Rancher deployments require correct management-cluster sizing, tuned etcd, and a properly sized HA installation. If Rancher runs on K3s, use a supported HA datastore instead of embedded SQLite. For deployments beyond Rancher's published 500-cluster / 5000-node guidance, work with SUSE Rancher Support to review your specific architecture and receive guidance on enterprise-scale deployments.

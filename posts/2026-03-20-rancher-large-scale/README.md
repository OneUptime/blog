# How to Configure Rancher for Large-Scale Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Large Scale, Enterprise, Performance

Description: Configure Rancher to manage large-scale Kubernetes deployments with hundreds of clusters and thousands of nodes through architecture, resource planning, and operational practices.

## Introduction

Rancher is capable of managing hundreds of Kubernetes clusters from a single control plane. However, achieving this scale requires careful architecture decisions, proper resource allocation, and operational discipline. This guide covers the key considerations for deploying Rancher at scale.

## Prerequisites

- A currently supported Rancher release (latest stable recommended)
- Dedicated infrastructure for Rancher's local cluster
- External monitoring and alerting
- Network connectivity between Rancher and all managed clusters

## Step 1: Architecture for Scale

```text
Large-Scale Rancher Architecture:
├── Rancher Local Cluster (RKE2, dedicated management cluster)
│   ├── etcd-only server nodes: 3 dedicated nodes (SSD-backed storage)
│   ├── Control-plane-only server nodes: 3 dedicated nodes
│   └── Rancher pods: 3 replicas minimum
│
├── Region A Clusters (50+ clusters)
│   ├── Production clusters
│   ├── Staging clusters
│   └── Development clusters
│
├── Region B Clusters (50+ clusters)
│   └── ... same pattern
│
└── Fleet GitOps (manages all clusters)
```

```bash
# Rancher publishes sizing guidance up to 500 managed clusters and 5,000 nodes
# on a dedicated upstream cluster. Larger environments require custom tuning
# and evaluation.
#
# Published per-node guidance for a large RKE2 upstream cluster:
# - 16 vCPU and 64 GB RAM on each Rancher local-cluster node
# - SSD-backed etcd storage and Rancher etcd tuning for large installations

# Check current cluster count
kubectl get clusters.management.cattle.io --all-namespaces --no-headers | wc -l
```

## Step 2: Configure Rancher Server for Scale

```yaml
# rancher-scale-values.yaml - Helm values for large deployments
replicas: 3

resources:
  requests:
    cpu: 4000m
    memory: 8Gi
  limits:
    cpu: 8000m
    memory: 16Gi

# Larger management clusters may need a longer cache sync timeout
cacheSyncTimeout: 10m

# Spread Rancher replicas across nodes
antiAffinity: required
topologyKey: kubernetes.io/hostname

# Run Rancher only on dedicated management nodes
extraNodeSelectorTerms:
  - key: rancher-role
    operator: In
    values:
      - rancher-server

extraTolerations:
  - key: rancher-role
    operator: Equal
    value: rancher-server
    effect: NoSchedule
```

## Step 3: Scale the Local Cluster etcd

```yaml
# rke2-config-scale.yaml - etcd tuning for 100+ managed clusters
# /etc/rancher/rke2/config.yaml on dedicated etcd-only nodes

disable-apiserver: true
disable-controller-manager: true
disable-scheduler: true

etcd-arg:
  - "quota-backend-bytes=5368709120"  # 5GB example from Rancher docs
  - "data-dir=/var/lib/etcd/data"
  - "wal-dir=/var/lib/etcd/wal"

# /etc/rancher/rke2/config.yaml on dedicated control-plane-only nodes
---
server: https://<etcd-node>:9345
disable-etcd: true
```

```bash
# Optional: taint dedicated nodes so general workloads do not land on them
kubectl taint nodes etcd-node-01 dedicated=etcd:NoSchedule
kubectl label nodes etcd-node-01 dedicated=etcd

kubectl taint nodes cp-node-01 dedicated=control-plane:NoSchedule
kubectl label nodes cp-node-01 dedicated=control-plane
```

## Step 4: Configure Fleet for Scale

```yaml
# gitrepo-scale.yaml - Fleet configuration for many clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: production-apps
  namespace: fleet-default
spec:
  repo: https://github.com/company/k8s-configs
  branch: main
  paths:
    - clusters/production
  pollingInterval: 5m0s
  targets:
    - name: all-production
      clusterSelector:
        matchLabels:
          env: production
```

## Step 5: Implement Cluster Grouping

```bash
# Use Fleet ClusterGroups for organized management
cat <<EOF | kubectl apply -f -
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-east-production
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production
      region: us-east
EOF

# Apply different configs to different groups
# Use GitRepo targets to filter by cluster labels
```

## Step 6: Implement Observability at Scale

```yaml
# rancher-monitoring-scale.yaml - Monitoring tuned for scale
prometheus:
  prometheusSpec:
    retention: 7d  # Reduce retention for scale
    resources:
      requests:
        cpu: 2000m
        memory: 8Gi
    # Shard Prometheus for scale
    shards: 3
    # Remote write to Thanos for long-term storage
    remoteWrite:
      - url: http://thanos-receive:10908/api/v1/receive

grafana:
  resources:
    requests:
      memory: 1Gi
    limits:
      memory: 2Gi
```

## Step 7: Network Considerations

```bash
# Each downstream cluster has a cattle-cluster-agent that opens a tunnel to Rancher.
# Use a load balancer that forwards TCP/80 and TCP/443 to all Rancher nodes,
# and make sure downstream clusters can reach the Rancher server reliably.

# Check Rancher server pods
kubectl -n cattle-system get pods -l app=rancher

# Check the cluster agent on a downstream cluster
kubectl --context <downstream-cluster-context> -n cattle-system get deployment cattle-cluster-agent
```

## Conclusion

Running Rancher at large scale requires dedicated infrastructure, carefully tuned configuration, and solid operational practices. The most critical factors are properly sized etcd storage on fast SSDs, adequate CPU and memory for the Rancher management cluster, and network infrastructure that keeps downstream cluster agents connected reliably. Use Fleet for GitOps-based cluster management at scale, and implement comprehensive monitoring to detect performance degradation early.

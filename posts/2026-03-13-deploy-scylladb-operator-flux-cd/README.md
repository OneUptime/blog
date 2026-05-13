# How to Deploy ScyllaDB Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, ScyllaDB, Cassandra, NoSQL, Database Operators

Description: Deploy the ScyllaDB Operator for high-performance NoSQL workloads on Kubernetes using Flux CD for GitOps-managed ScyllaDB clusters.

---

## Introduction

ScyllaDB is a high-performance NoSQL database compatible with both the Apache Cassandra and Amazon DynamoDB APIs. Written in C++ using the Seastar framework, it avoids JVM overhead and garbage collection pauses, delivering low-latency performance at scale. The ScyllaDB Operator manages ScyllaDB clusters on Kubernetes with features like rack-aware placement, CPU pinning, and backup and repair task integration through ScyllaDB Manager.

Deploying ScyllaDB through Flux CD ensures that cluster topology and ScyllaDB configuration are version-controlled. The ScyllaDB Operator is available as a Helm chart and manages the cluster through the `ScyllaCluster` CRD.

## Prerequisites

- A Kubernetes version supported by your ScyllaDB Operator release with Flux CD bootstrapped
- `cert-manager` installed, or a custom webhook certificate configured for the operator
- Nodes with dedicated CPU cores for ScyllaDB (CPU pinning is key for performance)
- Local NVMe SSDs or high-IOPS block storage
- `kubectl` and `flux` CLIs installed

## Step 1: Add the ScyllaDB HelmRepository

```yaml
# infrastructure/sources/scylla-helm.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: scylla
  namespace: flux-system
spec:
  interval: 12h
  url: https://scylla-operator-charts.storage.googleapis.com/stable
```

## Step 2: Deploy the ScyllaDB Operator

```yaml
# infrastructure/databases/scylladb/operator/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: scylla-operator
```

```yaml
# infrastructure/databases/scylladb/operator/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: scylla-operator
  namespace: scylla-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: scylla-operator
      version: "v1.20.2"
      sourceRef:
        kind: HelmRepository
        name: scylla
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

## Step 3: Create a ScyllaCluster

```yaml
# infrastructure/databases/scylladb/cluster/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: scylla
```

```yaml
# infrastructure/databases/scylladb/cluster/scyllacluster.yaml
apiVersion: scylla.scylladb.com/v1
kind: ScyllaCluster
metadata:
  name: scylla
  namespace: scylla
spec:
  agentVersion: 3.9.0
  version: 2026.1.0

  datacenter:
    name: us-east-1
    racks:
      - name: us-east-1a
        scyllaConfig: scylla-config
        members: 1
        storage:
          capacity: 500Gi
          storageClassName: local-nvme  # use local NVMe for best performance
        resources:
          limits:
            cpu: 8
            memory: 32Gi
          requests:
            cpu: 8
            memory: 32Gi
        # Placement: one pod per node
        placement:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    scylla/cluster: scylla
          tolerations:
            - key: scylla-operator.scylladb.com/dedicated
              operator: Equal
              value: scyllaclusters
              effect: NoSchedule
      - name: us-east-1b
        scyllaConfig: scylla-config
        members: 1
        storage:
          capacity: 500Gi
          storageClassName: local-nvme  # use local NVMe for best performance
        resources:
          limits:
            cpu: 8
            memory: 32Gi
          requests:
            cpu: 8
            memory: 32Gi
        placement:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    scylla/cluster: scylla
          tolerations:
            - key: scylla-operator.scylladb.com/dedicated
              operator: Equal
              value: scyllaclusters
              effect: NoSchedule
      - name: us-east-1c
        scyllaConfig: scylla-config
        members: 1
        storage:
          capacity: 500Gi
          storageClassName: local-nvme  # use local NVMe for best performance
        resources:
          limits:
            cpu: 8
            memory: 32Gi
          requests:
            cpu: 8
            memory: 32Gi
        placement:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    scylla/cluster: scylla
          tolerations:
            - key: scylla-operator.scylladb.com/dedicated
              operator: Equal
              value: scyllaclusters
              effect: NoSchedule
```

## Step 4: Create ScyllaDB Configuration ConfigMaps

```yaml
# infrastructure/databases/scylladb/cluster/scylla-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scylla-config
  namespace: scylla
data:
  scylla.yaml: |
    # Partitioner
    partitioner: org.apache.cassandra.dht.Murmur3Partitioner
    # Endpoint snitch for rack awareness
    endpoint_snitch: GossipingPropertyFileSnitch
    # Request timeouts
    read_request_timeout_in_ms: 5000
    write_request_timeout_in_ms: 2000
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/scylla-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: scylla-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/scylladb/operator
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: scylla-operator
      namespace: scylla-operator
---
# clusters/production/scylladb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: scylladb
  namespace: flux-system
spec:
  dependsOn:
    - name: scylla-operator
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/scylladb/cluster
  prune: true
```

## Step 6: Verify the Cluster

```bash
# Check operator status
kubectl get deployment scylla-operator -n scylla-operator

# Check ScyllaCluster status
kubectl get scyllacluster scylla -n scylla

# Check all pods
kubectl get pods -n scylla

# Check cluster ring status
POD=$(kubectl get pods -n scylla \
  -l scylla/cluster=scylla,scylla-operator.scylladb.com/pod-type=scylladb-node \
  -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n scylla "$POD" -c scylla -- nodetool status

# Connect via cqlsh
kubectl exec -n scylla service/scylla-client -c scylla -- cqlsh

# Create a test keyspace
kubectl exec -n scylla service/scylla-client -c scylla -- cqlsh -e \
  "CREATE KEYSPACE myapp WITH replication = {'class': 'NetworkTopologyStrategy', 'us-east-1': 3};"
```

## Best Practices

- Use dedicated nodes and keep ScyllaDB CPU and memory requests equal to limits so the pods get the Guaranteed QoS class required for CPU pinning.
- Use local NVMe storage rather than network block storage - ScyllaDB's performance is extremely sensitive to storage latency.
- Set replication factor to 3 (`NetworkTopologyStrategy`) for production keyspaces and spread the cluster across at least three racks or availability zones.
- Deploy ScyllaDB Manager alongside the operator if you want operator-managed repair and backup tasks.
- Monitor ScyllaDB with the Grafana dashboards from the ScyllaDB Monitoring Stack for latency, throughput, and compaction metrics.

## Conclusion

The ScyllaDB Operator deployed via Flux CD provides a high-performance, C++-native Cassandra-compatible NoSQL database with Kubernetes-native management. CPU pinning and local NVMe storage help deliver consistent low-latency performance. With Flux managing the operator and ScyllaCluster CRDs, your NoSQL database clusters are reproducibly defined in Git and automatically kept in sync with your desired topology.

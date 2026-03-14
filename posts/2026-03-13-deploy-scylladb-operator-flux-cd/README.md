# How to Deploy ScyllaDB Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, ScyllaDB, Cassandra, NoSQL, Database Operators

Description: Deploy the ScyllaDB Operator for high-performance NoSQL workloads on Kubernetes using Flux CD for GitOps-managed ScyllaDB clusters.

---

## Introduction

ScyllaDB is a high-performance NoSQL database compatible with both the Apache Cassandra and Amazon DynamoDB APIs. Written in C++ using the Seastar framework, it avoids JVM overhead and garbage collection pauses, delivering microsecond-level latency at scale. The ScyllaDB Operator manages ScyllaDB clusters on Kubernetes with features like rack-aware placement, shard-per-CPU allocation, and automated repair scheduling.

Deploying ScyllaDB through Flux CD ensures that cluster topology, shard configuration, and repair schedules are version-controlled. The ScyllaDB Operator is available as a Helm chart and manages the cluster through the `ScyllaCluster` CRD.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
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
# infrastructure/databases/scylladb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: scylla-operator
```

```yaml
# infrastructure/databases/scylladb/operator.yaml
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
      version: "1.13.0"
      sourceRef:
        kind: HelmRepository
        name: scylla
        namespace: flux-system
  install:
    crds: Create
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
# infrastructure/databases/scylladb/scyllacluster.yaml
apiVersion: scylla.scylladb.com/v1
kind: ScyllaCluster
metadata:
  name: scylla
  namespace: scylla
spec:
  agentVersion: 3.3.0
  version: 6.1.2
  cpuset: true   # Enable CPU set for dedicated CPU pinning

  datacenter:
    name: us-east-1
    racks:
      - name: rack-1
        scyllaConfig: scylla-config
        scyllaAgentConfig: scylla-agent-config
        members: 3
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
            - key: scylla-dedicated
              operator: Exists
```

## Step 4: Create ScyllaDB Configuration ConfigMaps

```yaml
# infrastructure/databases/scylladb/scylla-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scylla-config
  namespace: scylla
data:
  scylla.yaml: |
    # Cluster name
    cluster_name: "production-cluster"
    # Partitioner
    partitioner: org.apache.cassandra.dht.Murmur3Partitioner
    # Endpoint snitch for rack awareness
    endpoint_snitch: GossipingPropertyFileSnitch
    # Compaction settings
    compaction_throughput_mb_per_sec: 128
    # Memory settings (ScyllaDB auto-configures based on cpuset)
    # Replication factor
    default_keyspace_rf: 3
    # Consistency level
    read_request_timeout_in_ms: 5000
    write_request_timeout_in_ms: 2000
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: scylla-agent-config
  namespace: scylla
data:
  scylla-manager-agent.yaml: |
    # Scylla Manager Agent configuration
    auth_token: ""  # set via secret in production
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/scylladb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: scylladb
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/scylladb
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: scylla-operator
      namespace: scylla-operator
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
kubectl exec -n scylla scylla-us-east-1-rack-1-0 -- nodetool status

# Connect via cqlsh
kubectl exec -n scylla scylla-us-east-1-rack-1-0 -- cqlsh

# Create a test keyspace
kubectl exec -n scylla scylla-us-east-1-rack-1-0 -- cqlsh -e \
  "CREATE KEYSPACE myapp WITH replication = {'class': 'NetworkTopologyStrategy', 'us-east-1': 3};"
```

## Best Practices

- Enable `cpuset: true` and use dedicated nodes with CPU taints (`scylla-dedicated: NoSchedule`) so ScyllaDB's CPU pinning works correctly.
- Use local NVMe storage rather than network block storage — ScyllaDB's performance is extremely sensitive to storage latency.
- Set replication factor to 3 (`NetworkTopologyStrategy`) for all production keyspaces.
- Deploy Scylla Manager alongside the operator for automated repair and backup scheduling.
- Monitor ScyllaDB with the Grafana dashboards from the ScyllaDB Monitoring Stack for latency, throughput, and compaction metrics.

## Conclusion

The ScyllaDB Operator deployed via Flux CD provides a high-performance, C++-native Cassandra-compatible NoSQL database with Kubernetes-native management. CPU pinning and local NVMe storage deliver consistent microsecond latency that JVM-based alternatives cannot match. With Flux managing the operator and ScyllaCluster CRDs, your NoSQL database clusters are reproducibly defined in Git and automatically kept in sync with your desired topology.

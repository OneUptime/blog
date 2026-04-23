# How to Deploy Cassandra on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cassandra, Database, NoSQL, Wide-Column

Description: Deploy Apache Cassandra on Rancher for highly available, distributed wide-column storage optimized for write-heavy workloads and time-series data.

## Introduction

Apache Cassandra is a highly scalable, distributed NoSQL database designed for handling large amounts of data with high availability and no single point of failure. It excels at write-heavy workloads, time-series data, and geographically distributed deployments. This guide covers deploying Cassandra on Rancher using both Helm and the K8ssandra operator.

## Prerequisites

- Rancher-managed cluster with at least 3 nodes
- 8GB+ RAM per Cassandra node recommended for production
- SSD storage for best performance
- kubectl with cluster-admin access

## Step 1: Deploy Cassandra with Bitnami Helm Chart

```yaml
# cassandra-values.yaml - Cassandra configuration

dbUser:
  user: cassandra
  password: "CassandraP@ss"

cluster:
  name: "rancher-cassandra"
  seedCount: 2
  datacenter: "dc1"
  endpointSnitch: "GossipingPropertyFileSnitch"
  numTokens: 256

replicaCount: 3

resources:
  requests:
    memory: 2Gi
    cpu: "1"
  limits:
    memory: 4Gi
    cpu: "2"

persistence:
  enabled: true
  storageClass: "standard"
  size: 50Gi

jvm:
  maxHeapSize: 2G
  extraOpts: "-XX:+UseG1GC -XX:G1RSetUpdatingPauseTimePercent=5 -XX:MaxGCPauseMillis=300"

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
```

```bash
# Deploy Cassandra
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install cassandra bitnami/cassandra \
  --namespace databases \
  --create-namespace \
  --values cassandra-values.yaml \
  --wait \
  --timeout 20m

# Check status
kubectl get pods -n databases -l app.kubernetes.io/name=cassandra
```

## Step 2: Verify Cassandra Cluster

```bash
# Check cluster status using nodetool
kubectl exec -n databases cassandra-0 -- \
  nodetool status

# Check cluster info
kubectl exec -n databases cassandra-0 -- \
  nodetool info

# Connect with cqlsh
kubectl exec -n databases -it cassandra-0 -- \
  cqlsh -u cassandra -p CassandraP@ss
```

## Step 3: Create Keyspace and Tables

```bash
# Connect to CQL shell
kubectl exec -n databases -it cassandra-0 -- \
  cqlsh cassandra-0.cassandra-headless.databases.svc.cluster.local \
  -u cassandra -p CassandraP@ss
```

Inside cqlsh:

```sql
-- Create a keyspace with network topology replication
CREATE KEYSPACE IF NOT EXISTS myapp
WITH REPLICATION = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3  -- Replication factor of 3
};

USE myapp;

-- Create a time-series table
CREATE TABLE IF NOT EXISTS events (
  device_id UUID,
  event_time TIMESTAMP,
  event_type TEXT,
  payload TEXT,
  PRIMARY KEY ((device_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1
  };

-- Insert test data
INSERT INTO events (device_id, event_time, event_type, payload)
VALUES (uuid(), toTimestamp(now()), 'click', '{"button": "submit"}');

-- Query events
SELECT * FROM events LIMIT 10;
```

## Step 4: Deploy with K8ssandra Operator (Production)

```bash
# Install K8ssandra operator
helm repo add k8ssandra https://helm.k8ssandra.io/stable
helm repo update

helm install k8ssandra-operator k8ssandra/k8ssandra-operator \
  --namespace k8ssandra-operator \
  --create-namespace \
  --set global.clusterScoped=true \
  --wait
```

```yaml
# k8ssandra-cluster.yaml - K8ssandra production cluster
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: cassandra-prod
  namespace: databases
spec:
  cassandra:
    serverVersion: "4.1.3"
    datacenters:
      - metadata:
          name: dc1
        size: 3
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: standard
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 50Gi
        config:
          jvmOptions:
            heapSize: 2Gi
          cassandraYaml:
            num_tokens: 256
            compaction_throughput_mb_per_sec: 64
        resources:
          requests:
            memory: 4Gi
            cpu: "2"
          limits:
            memory: 8Gi
            cpu: "4"

  # Stargate API layer (optional)
  stargate:
    size: 1
    heapSize: 512Mi

  # Reaper for repairs
  reaper:
    autoScheduling:
      enabled: true
```

```bash
# Deploy the K8ssandra cluster
kubectl apply -f k8ssandra-cluster.yaml
```

## Step 5: Configure Cassandra for Application Access

```yaml
# app-cassandra-config.yaml - Application Cassandra configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cassandra-config
  namespace: production
data:
  CASSANDRA_HOSTS: "cassandra-0.cassandra-headless.databases.svc.cluster.local,cassandra-1.cassandra-headless.databases.svc.cluster.local,cassandra-2.cassandra-headless.databases.svc.cluster.local"
  CASSANDRA_PORT: "9042"
  CASSANDRA_KEYSPACE: "myapp"
  CASSANDRA_CONSISTENCY: "LOCAL_QUORUM"
  CASSANDRA_DATACENTER: "dc1"
```

## Step 6: Run Manual Repairs

```bash
# Run a manual repair with nodetool
kubectl exec -n databases cassandra-0 -- \
  nodetool repair -pr myapp events

# Check repair progress
kubectl exec -n databases cassandra-0 -- \
  nodetool netstats
```

## Troubleshooting

```bash
# Check gossip state
kubectl exec -n databases cassandra-0 -- \
  nodetool gossipinfo

# Check performance stats
kubectl exec -n databases cassandra-0 -- \
  nodetool tpstats

# Check table stats
kubectl exec -n databases cassandra-0 -- \
  nodetool tablestats myapp.events

# Flush memtable to disk
kubectl exec -n databases cassandra-0 -- \
  nodetool flush myapp

# Check logs for errors
kubectl logs -n databases cassandra-0 --tail=100 | grep -i error
```

## Conclusion

Cassandra on Rancher provides linear horizontal scalability for write-intensive workloads. The K8ssandra operator is recommended for production as it provides automated repairs, monitoring integration, and backup capabilities. Always model your data around your access patterns (not relationships), use appropriate replication factors for your availability requirements, and schedule regular repairs to prevent data inconsistencies across replicas.

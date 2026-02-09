# How to Deploy ScyllaDB on Kubernetes for High-Performance NoSQL Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ScyllaDB, NoSQL, Database, Performance

Description: Deploy ScyllaDB on Kubernetes for ultra-low latency NoSQL workloads, including operator installation, rack awareness, tuning parameters, and performance optimization strategies.

---

ScyllaDB delivers exceptional performance for NoSQL workloads by reimplementing Cassandra in C++ with a shard-per-core architecture. On Kubernetes, ScyllaDB provides the scalability of distributed databases with latencies measured in microseconds rather than milliseconds.

## Understanding ScyllaDB Architecture

ScyllaDB uses a shared-nothing architecture where each CPU core operates independently on its own shard. This design eliminates lock contention and enables true thread-level parallelism. Unlike traditional databases that share resources between threads, ScyllaDB assigns memory, disk I/O, and network connections per core.

The database automatically handles data distribution using consistent hashing. When you write data, ScyllaDB determines which nodes should store replicas based on the partition key. Reads query multiple replicas in parallel and return the first response, minimizing latency.

ScyllaDB maintains Cassandra compatibility at the CQL protocol level, allowing applications to migrate from Cassandra without code changes. However, the internal implementation differs significantly, requiring different tuning approaches.

## Installing the Scylla Operator

The Scylla Operator manages ScyllaDB clusters on Kubernetes, handling deployment, scaling, and day-2 operations:

```bash
# Add the Scylla Helm repository
helm repo add scylla https://scylla-operator-charts.storage.googleapis.com/stable
helm repo update

# Create namespace for operator
kubectl create namespace scylla-operator

# Install the operator
helm install scylla-operator scylla/scylla-operator \
  --namespace scylla-operator \
  --create-namespace \
  --set webhook.enabled=true
```

Verify the operator is running:

```bash
kubectl get pods -n scylla-operator
kubectl logs -n scylla-operator -l app.kubernetes.io/name=scylla-operator
```

## Configuring Node Resources

ScyllaDB performs best with dedicated nodes and proper resource allocation. Label nodes for ScyllaDB workloads:

```bash
# Label nodes for ScyllaDB
kubectl label nodes node-1 node-2 node-3 workload-type=scylladb

# Taint nodes to dedicate them to ScyllaDB
kubectl taint nodes node-1 node-2 node-3 workload=scylladb:NoSchedule
```

Create a custom StorageClass for NVMe or high-performance SSDs:

```yaml
# scylla-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: scylla-nvme
provisioner: kubernetes.io/aws-ebs
parameters:
  type: io2
  iops: "16000"
  throughput: "1000"
  encrypted: "true"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Apply the storage class:

```bash
kubectl apply -f scylla-storage-class.yaml
```

## Creating a ScyllaDB Cluster

Define a ScyllaCluster resource with production settings:

```yaml
# scylla-cluster.yaml
apiVersion: scylla.scylladb.com/v1
kind: ScyllaCluster
metadata:
  name: scylla-cluster
  namespace: scylla
spec:
  version: 5.4.2
  agentVersion: 3.2.6

  # Datacenter configuration
  datacenter:
    name: us-east-1
    racks:
      - name: us-east-1a
        members: 3
        storage:
          storageClassName: scylla-nvme
          capacity: 500Gi
        resources:
          requests:
            cpu: 7
            memory: 28Gi
          limits:
            cpu: 7
            memory: 28Gi
        placement:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: topology.kubernetes.io/zone
                      operator: In
                      values:
                        - us-east-1a
                    - key: workload-type
                      operator: In
                      values:
                        - scylladb
          tolerations:
            - key: workload
              operator: Equal
              value: scylladb
              effect: NoSchedule
          podAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app.kubernetes.io/name
                        operator: In
                        values:
                          - scylla
                  topologyKey: kubernetes.io/hostname

      - name: us-east-1b
        members: 3
        storage:
          storageClassName: scylla-nvme
          capacity: 500Gi
        resources:
          requests:
            cpu: 7
            memory: 28Gi
          limits:
            cpu: 7
            memory: 28Gi
        placement:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: topology.kubernetes.io/zone
                      operator: In
                      values:
                        - us-east-1b
                    - key: workload-type
                      operator: In
                      values:
                        - scylladb
          tolerations:
            - key: workload
              operator: Equal
              value: scylladb
              effect: NoSchedule

      - name: us-east-1c
        members: 3
        storage:
          storageClassName: scylla-nvme
          capacity: 500Gi
        resources:
          requests:
            cpu: 7
            memory: 28Gi
          limits:
            cpu: 7
            memory: 28Gi
        placement:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: topology.kubernetes.io/zone
                      operator: In
                      values:
                        - us-east-1c
                    - key: workload-type
                      operator: In
                      values:
                        - scylladb
          tolerations:
            - key: workload
              operator: Equal
              value: scylladb
              effect: NoSchedule

  # Developer mode (set to false for production)
  developerMode: false

  # CPU pinning for optimal performance
  cpuset: true

  # Automatic repairs
  automaticOrphanedNodeCleanup: true

  # Sysctls for network tuning
  sysctls:
    - "fs.aio-max-nr=1048576"

  # Network configuration
  network:
    hostNetworking: false

  # Scylla configuration
  scyllaArgs: "--blocked-reactor-notify-ms 500 --abort-on-lsa-bad-alloc 1 --abort-on-seastar-bad-alloc --abort-on-internal-error 1 --log-to-stdout 1"

  # Alternator (DynamoDB-compatible API) - optional
  # alternator:
  #   port: 8000
  #   writeIsolation: only_rmw_uses_lwt
```

Create the namespace and deploy the cluster:

```bash
kubectl create namespace scylla
kubectl apply -f scylla-cluster.yaml
```

## Monitoring Cluster Deployment

Watch the cluster come online:

```bash
# Check ScyllaCluster status
kubectl get scyllaclusters -n scylla

# Watch pods being created
kubectl get pods -n scylla -w

# Check operator logs
kubectl logs -n scylla-operator -l app.kubernetes.io/name=scylla-operator -f

# Verify all pods are ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=scylla -n scylla --timeout=600s
```

Check cluster status from inside a pod:

```bash
kubectl exec -it -n scylla scylla-cluster-us-east-1-us-east-1a-0 -- nodetool status
```

You should see all nodes in UN (Up Normal) state.

## Creating Keyspaces and Tables

Access CQL shell to create your schema:

```bash
kubectl exec -it -n scylla scylla-cluster-us-east-1-us-east-1a-0 -- cqlsh
```

Create a keyspace with NetworkTopologyStrategy:

```sql
CREATE KEYSPACE app_data WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'us-east-1': 3
};

USE app_data;

-- Create a time-series table optimized for ScyllaDB
CREATE TABLE events (
  user_id UUID,
  event_time TIMESTAMP,
  event_type TEXT,
  event_data MAP<TEXT, TEXT>,
  PRIMARY KEY ((user_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'DAYS'
  }
  AND gc_grace_seconds = 86400
  AND default_time_to_live = 2592000;

-- Create a user profile table
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY,
  username TEXT,
  email TEXT,
  created_at TIMESTAMP,
  metadata MAP<TEXT, TEXT>
) WITH compaction = {
    'class': 'SizeTieredCompactionStrategy'
  };

-- Create secondary index
CREATE INDEX ON user_profiles (email);
```

## Configuring Client Access

Create a Service for client connections:

```yaml
# scylla-client-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: scylla-client
  namespace: scylla
spec:
  type: ClusterIP
  ports:
    - port: 9042
      targetPort: 9042
      protocol: TCP
      name: cql
  selector:
    app.kubernetes.io/name: scylla
    scylla/cluster: scylla-cluster
```

Apply the service:

```bash
kubectl apply -f scylla-client-service.yaml
```

Applications connect to `scylla-client.scylla.svc.cluster.local:9042`.

## Optimizing Performance Settings

Tune JVM settings for the Scylla pods:

```yaml
# Update ScyllaCluster with performance tuning
apiVersion: scylla.scylladb.com/v1
kind: ScyllaCluster
metadata:
  name: scylla-cluster
  namespace: scylla
spec:
  # ... previous configuration ...

  # Performance tuning arguments
  scyllaArgs: >-
    --blocked-reactor-notify-ms 500
    --abort-on-lsa-bad-alloc 1
    --abort-on-seastar-bad-alloc
    --abort-on-internal-error 1
    --log-to-stdout 1
    --smp 7
    --memory 24G
    --reserve-memory 4G
    --io-properties-file=/etc/scylla.d/io_properties.yaml
    --max-io-requests 128
```

## Implementing Backup Strategy

Create a backup using Scylla Manager:

```bash
# Install Scylla Manager Controller
kubectl apply -f https://raw.githubusercontent.com/scylladb/scylla-operator/v1.11.0/examples/common/manager.yaml

# Create a backup task
kubectl exec -it -n scylla-operator scylla-manager-0 -- sctool backup \
  --cluster scylla-cluster \
  --location s3:scylla-backups \
  --retention 7
```

## Monitoring ScyllaDB Performance

Access Prometheus metrics:

```bash
# Port forward to Scylla metrics endpoint
kubectl port-forward -n scylla scylla-cluster-us-east-1-us-east-1a-0 9180:9180

# Access metrics at http://localhost:9180/metrics
```

Key metrics to monitor:

- `scylla_transport_requests_served` - CQL requests per second
- `scylla_reactor_utilization` - CPU utilization per shard
- `scylla_storage_proxy_coordinator_read_latency` - Read latency
- `scylla_storage_proxy_coordinator_write_latency` - Write latency
- `scylla_lsa_memory_used_bytes` - Memory usage
- `scylla_io_queue_total_operations` - I/O operations

## Testing Performance

Run a benchmark using cassandra-stress:

```bash
kubectl exec -it -n scylla scylla-cluster-us-east-1-us-east-1a-0 -- \
  cassandra-stress write \
  n=1000000 \
  -rate threads=200 \
  -node scylla-client.scylla.svc.cluster.local

kubectl exec -it -n scylla scylla-cluster-us-east-1-us-east-1a-0 -- \
  cassandra-stress read \
  n=1000000 \
  -rate threads=200 \
  -node scylla-client.scylla.svc.cluster.local
```

## Scaling the Cluster

Scale by adding more members to a rack:

```bash
kubectl patch scyllacluster scylla-cluster -n scylla --type merge -p '
{
  "spec": {
    "datacenter": {
      "racks": [
        {
          "name": "us-east-1a",
          "members": 4
        }
      ]
    }
  }
}'
```

The operator handles the scaling operation automatically, rebalancing data across the new nodes.

## Handling Node Failures

ScyllaDB automatically handles node failures through replication. When a node goes down, replica nodes continue serving requests. Once the failed node returns, hinted handoff and repair operations restore consistency.

Monitor repair operations:

```bash
kubectl exec -it -n scylla scylla-cluster-us-east-1-us-east-1a-0 -- nodetool repair
```

ScyllaDB on Kubernetes delivers exceptional performance for latency-sensitive NoSQL workloads. The Scylla Operator simplifies operations while maintaining the low-level performance characteristics that make ScyllaDB ideal for high-throughput applications. With proper resource allocation and tuning, ScyllaDB provides consistent sub-millisecond latencies at scale.

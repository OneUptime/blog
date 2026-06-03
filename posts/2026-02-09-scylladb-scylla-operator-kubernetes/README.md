# Deploy ScyllaDB on Kubernetes with the Scylla Operator for Low-Latency Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ScyllaDB, Kubernetes, Database

Description: Learn how to deploy ScyllaDB on Kubernetes using the Scylla Operator for high-performance, low-latency NoSQL workloads with Cassandra compatibility and improved resource efficiency.

---

ScyllaDB reimplements Cassandra in C++ for dramatically better performance and lower latencies. It provides full Cassandra API compatibility while delivering 10x better throughput with the same hardware. This guide demonstrates deploying ScyllaDB on Kubernetes using the official operator, optimizing for low-latency workloads that demand consistent sub-millisecond response times.

## Why ScyllaDB Over Cassandra

ScyllaDB's architecture eliminates Java garbage collection pauses that plague Cassandra under heavy load. The C++ implementation uses asynchronous I/O and a share-nothing architecture that maximizes CPU and disk utilization. Each CPU core runs an independent shard, avoiding lock contention and cache coherency overhead.

For Kubernetes deployments, ScyllaDB's resource efficiency means fewer pods to manage and lower infrastructure costs. The close-to-metal design squeezes maximum performance from each node, making it ideal for latency-sensitive applications like real-time analytics, IoT data storage, and high-frequency trading systems.

## Installing the Scylla Operator

Deploy the Scylla Operator to manage cluster lifecycle:

```bash
# Install cert-manager (required by Scylla Operator)
kubectl apply --server-side -f=https://raw.githubusercontent.com/scylladb/scylla-operator/v1.21/examples/third-party/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for='condition=established' --timeout=60s crd/certificates.cert-manager.io crd/issuers.cert-manager.io
for deploy in cert-manager cert-manager-cainjector cert-manager-webhook; do
  kubectl -n=cert-manager rollout status --timeout=10m deployment.apps/"${deploy}"
done

# Install Scylla Operator
kubectl create namespace scylla-operator
kubectl -n=scylla-operator apply --server-side -f=https://raw.githubusercontent.com/scylladb/scylla-operator/v1.21/deploy/operator.yaml

# Create namespace for Scylla cluster
kubectl create namespace scylla

# Verify operator installation
kubectl get pods -n scylla-operator
```

The operator manages ScyllaCluster custom resources, handling StatefulSet creation, configuration, and rolling updates.

## Deploying a ScyllaDB Cluster

Create a production-ready ScyllaDB cluster:

```yaml
# scylla-cluster.yaml
apiVersion: scylla.scylladb.com/v1
kind: ScyllaCluster
metadata:
  name: scylla-cluster
  namespace: scylla
spec:
  version: 5.4.0
  agentVersion: 3.2.0

  # Datacenter configuration
  datacenter:
    name: us-west-2
    racks:
      - name: us-west-2a
        members: 3
        storage:
          capacity: 200Gi
          storageClassName: fast-ssd
        resources:
          requests:
            cpu: 4
            memory: 16Gi
          limits:
            cpu: 8
            memory: 32Gi

        # Pod placement
        placement:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: topology.kubernetes.io/zone
                      operator: In
                      values:
                        - us-west-2a
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app.kubernetes.io/name
                      operator: In
                      values:
                        - scylla
                topologyKey: kubernetes.io/hostname

  # Developer mode (disable for production)
  developerMode: false

  # ScyllaDB configuration
  sysctls:
    - "fs.aio-max-nr=1048576"

  # Network configuration
  network:
    hostNetworking: false
    dnsPolicy: ClusterFirst

  # Additional ScyllaDB startup arguments
  scyllaArgs: "--smp 4 --memory 14G --reserve-memory 2G --overprovisioned"
```

Deploy the cluster:

```bash
kubectl apply -f scylla-cluster.yaml

# Watch cluster initialization
kubectl get scyllaclusters -n scylla -w

# Monitor pod creation
kubectl get pods -n scylla -w

# Cluster initialization takes 5-10 minutes
```

## Verifying Cluster Health

Check cluster status:

```bash
# Get cluster info
kubectl get scyllaclusters -n scylla scylla-cluster -o jsonpath='{.status}'

# Check node status using nodetool
kubectl exec -it -n scylla scylla-cluster-us-west-2-us-west-2a-0 -- nodetool status

# Expected output:
# Datacenter: us-west-2
# Status=Up/Down
# |/ State=Normal/Leaving/Joining/Moving
# --  Address        Load       Tokens  Owns    Host ID
# UN  10.244.1.5     1.2 GB     256     100.0%  abc123...
# UN  10.244.2.6     1.1 GB     256     100.0%  def456...
# UN  10.244.3.7     1.3 GB     256     100.0%  ghi789...

# Check replication status
kubectl exec -it -n scylla scylla-cluster-us-west-2-us-west-2a-0 -- \
  nodetool describecluster
```

## Connecting to ScyllaDB

Connect using CQL (Cassandra Query Language):

```bash
# Port-forward for local access
kubectl port-forward -n scylla svc/scylla-cluster-client 9042:9042

# Connect with cqlsh
kubectl exec -it -n scylla scylla-cluster-us-west-2-us-west-2a-0 -- cqlsh

# Or from external client
cqlsh localhost 9042
```

Create a keyspace and table:

```sql
-- Create keyspace with replication
CREATE KEYSPACE IF NOT EXISTS myapp
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'us-west-2': 3
};

USE myapp;

-- Create table optimized for writes
CREATE TABLE events (
  event_id UUID,
  user_id UUID,
  event_type TEXT,
  event_data TEXT,
  created_at TIMESTAMP,
  PRIMARY KEY (event_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'HOURS',
    'compaction_window_size': 1
  };

-- Insert test data
INSERT INTO events (event_id, user_id, event_type, event_data, created_at)
VALUES (uuid(), uuid(), 'user_login', '{"ip": "1.2.3.4"}', toTimestamp(now()));

-- Query data
SELECT * FROM events LIMIT 10;
```

## Optimizing for Low Latency

Configure ScyllaDB for minimal latency:

```yaml
# Update cluster configuration
spec:
  scyllaArgs: |
    --smp 8
    --memory 28G
    --reserve-memory 4G
```

Create I/O configuration for NVMe SSDs:

```yaml
# io-properties-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: scylla-io-properties
  namespace: scylla
data:
  io_properties.yaml: |
    disks:
      - mountpoint: /var/lib/scylla
        read_iops: 100000
        read_bandwidth: 1000000000
        write_iops: 50000
        write_bandwidth: 500000000
```

This configures ScyllaDB to maximize throughput from fast storage.

Mount the ConfigMap into each rack so the operator sidecar can pass `--io-setup=0 --io-properties-file=/etc/scylla.d/io_properties.yaml` when ScyllaDB starts:

```yaml
spec:
  datacenter:
    racks:
      - name: us-west-2a
        volumes:
          - name: io-properties
            configMap:
              name: scylla-io-properties
        volumeMounts:
          - name: io-properties
            mountPath: /etc/scylla.d/io_properties.yaml
            subPath: io_properties.yaml
            readOnly: true
```

## Implementing Multi-AZ Replication

Add additional racks for multi-AZ deployment:

```yaml
spec:
  datacenter:
    name: us-west-2
    racks:
      - name: us-west-2a
        members: 2
        # ... storage and resources ...

      - name: us-west-2b
        members: 2
        placement:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: topology.kubernetes.io/zone
                      operator: In
                      values:
                        - us-west-2b

      - name: us-west-2c
        members: 2
        placement:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: topology.kubernetes.io/zone
                      operator: In
                      values:
                        - us-west-2c
```

ScyllaDB uses rack-aware replica placement within the datacenter for high availability.

## Monitoring ScyllaDB Performance

Deploy ScyllaDB monitoring with the `ScyllaDBMonitoring` custom resource:

```yaml
# scylladbmonitoring.yaml
apiVersion: scylla.scylladb.com/v1alpha1
kind: ScyllaDBMonitoring
metadata:
  name: scylla-cluster-monitoring
  namespace: scylla
spec:
  endpointsSelector:
    matchLabels:
      app.kubernetes.io/name: scylla
      scylla-operator.scylladb.com/scylla-service-type: member
      scylla/cluster: scylla-cluster
  components:
    prometheus:
      mode: External
    grafana:
      datasources:
        - name: prometheus
          type: Prometheus
          url: http://prometheus.scylla.svc.cluster.local:9090
          prometheusOptions: {}
```

Key metrics to monitor:

- Read and write latency: use the ScyllaDB Monitoring dashboards or `nodetool proxyhistograms`
- Cache hit ratio: `scylla_cache_row_hits / (scylla_cache_row_hits + scylla_cache_row_misses)`
- Compaction backlog: `scylla_compaction_manager_pending_compactions`

ScyllaDB typically delivers p99 read latencies under 1ms with proper tuning.

## Scaling the Cluster

Add more nodes for capacity:

```bash
# Scale rack members
kubectl patch scyllacluster scylla-cluster -n scylla \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/datacenter/racks/0/members", "value": 5}]'

# ScyllaDB automatically rebalances data
kubectl get pods -n scylla -w

# Monitor rebalancing
kubectl exec -it -n scylla scylla-cluster-us-west-2-us-west-2a-0 -- \
  nodetool compactionstats
```

## Implementing Backup and Restore

Configure automated backups using Scylla Manager:

```yaml
# scylla-manager.yaml
apiVersion: scylla.scylladb.com/v1
kind: ScyllaCluster
metadata:
  name: scylla-cluster
  namespace: scylla
spec:
  # ... existing config ...

  backups:
    - name: daily-backup
      dc:
        - us-west-2
      location:
        - s3:scylla-backups/cluster-backups
      rateLimit:
        - "100"  # MiB/s
      retention: 7  # number of backups to retain
      cron: "0 2 * * *"
      snapshotParallel:
        - "us-west-2:2"
      uploadParallel:
        - "us-west-2:2"
```

Restore from backup:

```bash
# List available backups
kubectl -n scylla-manager exec -it deployment.apps/scylla-manager -- \
  sctool backup list -c scylla/scylla-cluster --all-clusters -L s3:scylla-backups/cluster-backups

# Restore schema, then table data
kubectl -n scylla-manager exec -it deployment.apps/scylla-manager -- \
  sctool restore -c scylla/scylla-cluster -L s3:scylla-backups/cluster-backups -T <snapshot-tag> --restore-schema

kubectl -n scylla-manager exec -it deployment.apps/scylla-manager -- \
  sctool restore -c scylla/scylla-cluster -L s3:scylla-backups/cluster-backups -T <snapshot-tag> --restore-tables
```

## Tuning for Specific Workloads

Optimize compaction for write-heavy workloads:

```sql
-- Use LeveledCompactionStrategy for read-heavy
ALTER TABLE myapp.events
WITH compaction = {
  'class': 'LeveledCompactionStrategy',
  'sstable_size_in_mb': 160
};

-- Use TimeWindowCompactionStrategy for time-series
ALTER TABLE myapp.events
WITH compaction = {
  'class': 'TimeWindowCompactionStrategy',
  'compaction_window_unit': 'HOURS',
  'compaction_window_size': 1
};

-- Use IncrementalCompactionStrategy for write-heavy
ALTER TABLE myapp.events
WITH compaction = {
  'class': 'IncrementalCompactionStrategy'
};
```

## Implementing Read Repair

Configure consistency levels for data integrity:

```sql
-- Strong consistency reads
CONSISTENCY QUORUM;
SELECT * FROM events WHERE event_id = ?;

-- Eventual consistency reads (faster)
CONSISTENCY ONE;
SELECT * FROM events WHERE event_id = ?;

-- Run repairs regularly, or schedule repairs with ScyllaDB Manager
```

## Conclusion

ScyllaDB on Kubernetes delivers exceptional performance for low-latency NoSQL workloads while maintaining Cassandra compatibility. The C++ implementation eliminates JVM overhead, providing consistent sub-millisecond latencies even under heavy load.

The Scylla Operator simplifies cluster management, handling deployment, scaling, and configuration changes declaratively. For applications requiring high throughput and predictable low latencies, ScyllaDB provides a compelling alternative to Cassandra with significant performance improvements and reduced operational complexity. Combined with proper monitoring and tuning, ScyllaDB on Kubernetes creates a powerful platform for demanding distributed database workloads.

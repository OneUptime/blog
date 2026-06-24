# Configure Cross-Datacenter CockroachDB Replication on Multi-Cluster Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, Database

Description: Learn how to set up cross-datacenter replication for CockroachDB across multiple Kubernetes clusters for disaster recovery, geo-distribution, and global data availability.

---

Cross-datacenter replication extends CockroachDB's built-in replication across separate Kubernetes clusters in different geographic locations. This improves resilience and enables low-latency data access for global users. This guide demonstrates configuring multi-cluster CockroachDB replication with locality-aware data placement. To survive the loss of an entire region or datacenter while remaining fully available, CockroachDB requires a region-survival configuration with at least three database regions.

## Understanding Multi-Cluster Replication Architecture

CockroachDB nodes in different datacenters join a single logical cluster through network connectivity. Each datacenter runs its own Kubernetes cluster with CockroachDB pods, but they coordinate through the distributed consensus protocol. Data replicates across datacenters based on locality configuration, ensuring replicas spread across geographic boundaries.

This differs from traditional active-passive replication. CockroachDB provides a multi-active topology where all datacenters can accept writes through the same logical cluster. CockroachDB coordinates transactions with serializable isolation and distributed consensus, providing global consistency without requiring a single primary database.

## Prerequisites and Network Setup

Before deploying cross-datacenter replication, establish network connectivity between Kubernetes clusters:

```bash
# For cloud providers, enable VPC peering

# AWS example:
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-cluster1 \
  --peer-vpc-id vpc-cluster2 \
  --peer-region us-east-1

# Configure security groups to allow CockroachDB ports
# Port 26257: SQL traffic
# Port 26258: inter-node gRPC traffic when using the CockroachDB Kubernetes Operator defaults
# Port 8080: Admin UI

# For on-premises, configure network routes between cluster networks
```

Ensure DNS resolution works across clusters:

```bash
# Test connectivity from cluster1 to cluster2
kubectl run -it --rm test --image=busybox --restart=Never -- \
  nslookup cockroachdb-public.cockroachdb.svc.cluster2.local
```

## Deploying CockroachDB in the First Datacenter

Install CockroachDB in the first Kubernetes cluster:

```yaml
# cluster1-cockroachdb.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cockroachdb
---
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb-dc1
  namespace: cockroachdb
spec:
  nodes: 3
  dataStore:
    pvc:
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd

  resources:
    requests:
      cpu: "2"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "16Gi"

  # Locality configuration for datacenter 1
  additionalArgs:
    - --locality=region=us-west-2,datacenter=dc1
    - --join=cockroachdb-dc1-0.cockroachdb-dc1.cockroachdb:26258,cockroachdb-dc1-1.cockroachdb-dc1.cockroachdb:26258,cockroachdb-dc1-2.cockroachdb-dc1.cockroachdb:26258,cockroachdb-dc2-0.cockroachdb-dc2.cockroachdb.svc.cluster2.local:26258,cockroachdb-dc2-1.cockroachdb-dc2.cockroachdb.svc.cluster2.local:26258,cockroachdb-dc2-2.cockroachdb-dc2.cockroachdb.svc.cluster2.local:26258

  tlsEnabled: true
```

Deploy in cluster1:

```bash
# Set context to cluster1
kubectl config use-context cluster1

# Apply configuration
kubectl apply -f cluster1-cockroachdb.yaml

# Wait for pods to be ready
kubectl get pods -n cockroachdb -w
```

## Deploying CockroachDB in the Second Datacenter

Deploy CockroachDB in the second cluster with matching configuration:

```yaml
# cluster2-cockroachdb.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cockroachdb
---
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb-dc2
  namespace: cockroachdb
spec:
  nodes: 3
  dataStore:
    pvc:
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd

  resources:
    requests:
      cpu: "2"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "16Gi"

  # Locality configuration for datacenter 2
  additionalArgs:
    - --locality=region=us-east-1,datacenter=dc2
    - --join=cockroachdb-dc1-0.cockroachdb-dc1.cockroachdb.svc.cluster1.local:26258,cockroachdb-dc1-1.cockroachdb-dc1.cockroachdb.svc.cluster1.local:26258,cockroachdb-dc1-2.cockroachdb-dc1.cockroachdb.svc.cluster1.local:26258,cockroachdb-dc2-0.cockroachdb-dc2.cockroachdb:26258,cockroachdb-dc2-1.cockroachdb-dc2.cockroachdb:26258,cockroachdb-dc2-2.cockroachdb-dc2.cockroachdb:26258

  tlsEnabled: true
```

Deploy in cluster2:

```bash
# Set context to cluster2
kubectl config use-context cluster2

# Apply configuration
kubectl apply -f cluster2-cockroachdb.yaml

# Monitor nodes joining the cluster
kubectl get pods -n cockroachdb -w
```

## Initializing the Multi-Cluster Database

Initialize the cluster once. If you use the CockroachDB Public operator, it creates the StatefulSet and initializes the cluster automatically; do not run `cockroach init` a second time. If you deploy unmanaged StatefulSets instead, run `cockroach init` exactly once from one node:

```bash
# Connect to a pod in cluster1
kubectl exec -it -n cockroachdb cockroachdb-dc1-0 \
  -- ./cockroach init --certs-dir=/cockroach/cockroach-certs

# Verify all nodes joined
kubectl exec -it -n cockroachdb cockroachdb-dc1-0 \
  -- ./cockroach node status --certs-dir=/cockroach/cockroach-certs

# Should show 6 nodes total (3 from each datacenter)
```

## Configuring Multi-Region Database Schema

Create databases with cross-datacenter replication:

```bash
# Connect to SQL interface
kubectl exec -it -n cockroachdb cockroachdb-dc1-0 \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs
```

```sql
-- Inside SQL shell
CREATE DATABASE globaldb PRIMARY REGION "us-west-2" REGIONS "us-west-2", "us-east-1";

ALTER DATABASE globaldb SURVIVE ZONE FAILURE;

-- Create multi-region table
USE globaldb;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL,
  name STRING,
  region crdb_internal_region AS (
    CASE
      WHEN email LIKE '%@us.example.com' THEN 'us-west-2'
      ELSE 'us-east-1'
    END
  ) STORED,
  created_at TIMESTAMP DEFAULT now()
) LOCALITY REGIONAL BY ROW AS region;

-- Global reference table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name STRING NOT NULL,
  price DECIMAL(10,2)
) LOCALITY GLOBAL;
```

The `REGIONAL BY ROW` locality homes each row in a specific region based on the `region` column, which must use the database's `crdb_internal_region` enum type. `GLOBAL` locality optimizes read-mostly reference tables for low-latency reads from all regions.

## Testing Cross-Datacenter Replication

Verify data replicates across datacenters:

```bash
# Insert data from cluster1
kubectl exec -it -n cockroachdb cockroachdb-dc1-0 \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --execute="INSERT INTO globaldb.users (email, name) VALUES ('alice@us.example.com', 'Alice');"

# Query from cluster2
kubectl config use-context cluster2
kubectl exec -it -n cockroachdb cockroachdb-dc2-0 \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --execute="SELECT * FROM globaldb.users;"

# Data should be visible immediately
```

Check replica placement:

```sql
SHOW RANGES FROM TABLE globaldb.users WITH DETAILS;

-- Shows which nodes hold replicas and leases for each range
```

## Configuring Follower Reads for Low Latency

Use follower reads to serve stale reads from local replicas:

```sql
-- Use follower reads in queries
SELECT * FROM users AS OF SYSTEM TIME follower_read_timestamp()
WHERE email = 'alice@us.example.com';

-- Or with maximum staleness
SELECT * FROM users AS OF SYSTEM TIME with_max_staleness('10s')
WHERE id = '00000000-0000-0000-0000-000000000001';
```

This allows eligible read-only queries to read from a nearby replica without contacting the leaseholder in another datacenter, reducing latency when the application can tolerate stale reads.

## Implementing Datacenter-Specific Application Routing

Route application traffic to the nearest datacenter:

```yaml
# app-deployment-dc1.yaml (deploy in cluster1)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: DB_HOST
              value: cockroachdb-dc1-public.cockroachdb:26257
            - name: DB_LOCALITY
              value: datacenter=dc1
          ports:
            - containerPort: 8080
```

Deploy similar configuration in cluster2 pointing to `cockroachdb-dc2-public`.

## Monitoring Cross-Datacenter Replication

Deploy monitoring in each cluster:

```yaml
# prometheus-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cockroachdb-monitor
  namespace: cockroachdb
spec:
  selector:
    matchLabels:
      app: cockroachdb
  endpoints:
    - port: http
      interval: 30s
      path: /_status/vars
```

Key metrics to monitor:

- Cross-datacenter latency: `round_trip_latency`
- Slow Raft requests: `requests_slow_raft`
- Unhealthy RPC connections: `rpc_connection_unhealthy`
- Network bytes sent/received: `sys_host_net_send_bytes`, `sys_host_net_recv_bytes`

Set up alerts for replication issues:

```yaml
# Alert when Raft requests are stuck
- alert: SlowRaftRequests
  expr: sum(requests_slow_raft) > 0
  for: 5m
  annotations:
    summary: "Slow Raft requests detected"
```

## Handling Datacenter Failures

Test resilience by simulating a single-node failure. In a two-region topology using `SURVIVE ZONE FAILURE`, do not expect the cluster to remain fully available after losing an entire datacenter. For full region failure survival, configure at least three database regions and use `ALTER DATABASE ... SURVIVE REGION FAILURE`.

```bash
# Simulate one CockroachDB node failure
kubectl config use-context cluster1
kubectl delete pod cockroachdb-dc1-0 -n cockroachdb

# Verify the cluster remains available from DC2
kubectl config use-context cluster2
kubectl exec -it -n cockroachdb cockroachdb-dc2-0 \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --execute="SELECT COUNT(*) FROM globaldb.users;"

# Kubernetes recreates the pod and CockroachDB rebalances as needed
```

When the pod recovers, it rejoins automatically:

```bash
kubectl config use-context cluster1
kubectl get pods -n cockroachdb -w

# Nodes catch up on missed updates automatically
```

## Optimizing Cross-Datacenter Write Performance

Configure write locality for better performance:

```sql
-- Pin frequently updated data to specific regions
CREATE TABLE user_sessions (
  user_id UUID PRIMARY KEY,
  session_token STRING,
  region crdb_internal_region NOT NULL,
  last_active TIMESTAMP DEFAULT now()
) LOCALITY REGIONAL BY ROW AS region;

-- Use ON CONFLICT for upserts to reduce cross-region traffic
INSERT INTO user_sessions (user_id, session_token, region)
VALUES ('00000000-0000-0000-0000-000000000001', 'token', 'us-west-2')
ON CONFLICT (user_id) DO UPDATE
SET last_active = now();
```

## Conclusion

Cross-datacenter CockroachDB replication on multi-cluster Kubernetes provides regional data placement and stronger resilience than a single-site deployment. By configuring locality-aware schemas and using follower reads, you optimize both performance and resilience.

The key advantage is the multi-active architecture. All datacenters can accept writes simultaneously through one logical cluster, while CockroachDB coordinates transactions with serializable isolation and consensus replication. Combined with Kubernetes orchestration for infrastructure management, this creates a distributed database platform that can be designed for zone or region failure survival when the topology and survival goals are configured accordingly.

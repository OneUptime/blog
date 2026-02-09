# How to Configure Cross-Datacenter CockroachDB Replication on Multi-Cluster Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, Databases

Description: Learn how to set up cross-datacenter replication for CockroachDB across multiple Kubernetes clusters for disaster recovery, geo-distribution, and global data availability.

---

Cross-datacenter replication extends CockroachDB's built-in replication across separate Kubernetes clusters in different geographic locations. This provides disaster recovery against complete cluster failures while enabling low-latency data access for global users. This guide demonstrates configuring multi-cluster CockroachDB replication with automatic failover and conflict resolution.

## Understanding Multi-Cluster Replication Architecture

CockroachDB nodes in different datacenters join a single logical cluster through network connectivity. Each datacenter runs its own Kubernetes cluster with CockroachDB pods, but they coordinate through the distributed consensus protocol. Data replicates across datacenters based on locality configuration, ensuring replicas spread across geographic boundaries.

This differs from traditional active-passive replication. CockroachDB provides multi-active topology where all datacenters accept writes. The system handles conflicts automatically through timestamp-based ordering, providing global consistency without requiring master election or failover procedures.

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
# Port 26257: SQL and inter-node traffic
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
    - --join=cockroachdb-dc1-0.cockroachdb-dc1.cockroachdb:26257,cockroachdb-dc1-1.cockroachdb-dc1.cockroachdb:26257,cockroachdb-dc1-2.cockroachdb-dc1.cockroachdb:26257,cockroachdb-dc2-0.cockroachdb-dc2.cockroachdb.svc.cluster2.local:26257,cockroachdb-dc2-1.cockroachdb-dc2.cockroachdb.svc.cluster2.local:26257,cockroachdb-dc2-2.cockroachdb-dc2.cockroachdb.svc.cluster2.local:26257

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
    - --join=cockroachdb-dc1-0.cockroachdb-dc1.cockroachdb.svc.cluster1.local:26257,cockroachdb-dc1-1.cockroachdb-dc1.cockroachdb.svc.cluster1.local:26257,cockroachdb-dc1-2.cockroachdb-dc1.cockroachdb.svc.cluster1.local:26257,cockroachdb-dc2-0.cockroachdb-dc2.cockroachdb:26257,cockroachdb-dc2-1.cockroachdb-dc2.cockroachdb:26257,cockroachdb-dc2-2.cockroachdb-dc2.cockroachdb:26257

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

Initialize the cluster from any node:

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

# Inside SQL shell
CREATE DATABASE globaldb PRIMARY REGION "us-west-2" REGIONS "us-east-1";

ALTER DATABASE globaldb SURVIVE ZONE FAILURE;

# Create multi-region table
USE globaldb;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL,
  name STRING,
  region STRING AS (
    CASE
      WHEN email LIKE '%@us.example.com' THEN 'us-west-2'
      ELSE 'us-east-1'
    END
  ) STORED,
  created_at TIMESTAMP DEFAULT now()
) LOCALITY REGIONAL BY ROW AS region;

# Global reference table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name STRING NOT NULL,
  price DECIMAL(10,2)
) LOCALITY GLOBAL;
```

The `REGIONAL BY ROW` locality pins each row to a specific region based on the `region` column. `GLOBAL` locality replicates to all regions for fast reads everywhere.

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
SHOW RANGES FROM TABLE globaldb.users;

# Shows which nodes hold replicas for each range
```

## Configuring Follower Reads for Low Latency

Enable follower reads to serve queries from local replicas:

```sql
-- Session-level setting
SET CLUSTER SETTING kv.closed_timestamp.target_duration = '1s';
SET CLUSTER SETTING kv.closed_timestamp.side_transport_interval = '500ms';

-- Use follower reads in queries
SELECT * FROM users AS OF SYSTEM TIME follower_read_timestamp()
WHERE email = 'alice@us.example.com';

-- Or with maximum staleness
SELECT * FROM users AS OF SYSTEM TIME with_max_staleness('10s')
WHERE id = 'some-uuid';
```

This allows queries to read from local replicas without cross-datacenter network calls, dramatically reducing latency.

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
- Replication lag: `replication.pending`
- Range quiescence: `range.adds`, `range.removes`
- Network bytes sent/received: `sys.network.sent`, `sys.network.recv`

Set up alerts for replication issues:

```yaml
# Alert when replication lag exceeds threshold
- alert: HighReplicationLag
  expr: sum(rate(replication_pending[5m])) > 100
  for: 5m
  annotations:
    summary: "High replication lag detected"
```

## Handling Datacenter Failures

Test failover by simulating datacenter failure:

```bash
# Simulate DC1 failure by scaling down all nodes
kubectl config use-context cluster1
kubectl scale statefulset cockroachdb-dc1 --replicas=0 -n cockroachdb

# Verify cluster remains available from DC2
kubectl config use-context cluster2
kubectl exec -it -n cockroachdb cockroachdb-dc2-0 \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --execute="SELECT COUNT(*) FROM globaldb.users;"

# Cluster automatically promotes replicas in DC2
```

When DC1 recovers, nodes rejoin automatically:

```bash
kubectl config use-context cluster1
kubectl scale statefulset cockroachdb-dc1 --replicas=3 -n cockroachdb

# Nodes catch up on missed updates automatically
```

## Optimizing Cross-Datacenter Write Performance

Configure write locality for better performance:

```sql
-- Pin frequently updated data to specific regions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token STRING,
  region STRING NOT NULL,
  last_active TIMESTAMP DEFAULT now()
) LOCALITY REGIONAL BY ROW AS region;

-- Use ON CONFLICT for upserts to reduce cross-region traffic
INSERT INTO user_sessions (user_id, session_token, region)
VALUES ('user-id', 'token', 'us-west-2')
ON CONFLICT (id) DO UPDATE
SET last_active = now();
```

## Conclusion

Cross-datacenter CockroachDB replication on multi-cluster Kubernetes provides enterprise-grade disaster recovery with automatic failover. By configuring locality-aware schemas and using follower reads, you optimize both performance and resilience.

The key advantage is the multi-active architecture that eliminates failover procedures. All datacenters accept writes simultaneously, and the system handles conflicts automatically through timestamp ordering. Combined with Kubernetes orchestration for infrastructure management, this creates a truly distributed database platform that survives complete datacenter failures without manual intervention or data loss.

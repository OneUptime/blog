# How to Deploy CockroachDB with Multi-Region Topology

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, Database

Description: Learn how to deploy CockroachDB in a multi-region Kubernetes configuration using the CockroachDB operator for geo-distributed, highly available database clusters with automated failover.

---

CockroachDB excels at multi-region deployments, providing strong consistency across geographic locations while surviving complete datacenter failures. When deployed on Kubernetes across multiple regions, it combines Kubernetes orchestration with CockroachDB's built-in geo-distribution capabilities. This guide walks through deploying a production-ready multi-region CockroachDB cluster using the official operator.

## Understanding CockroachDB Multi-Region Architecture

CockroachDB uses a distributed architecture where data is automatically replicated across multiple regions. Each region contains multiple nodes, and data is sharded across the cluster with configurable replica placement. The system survives region failures by maintaining at least three replicas distributed across different failure domains.

The multi-region setup provides three key benefits. First, it enables low-latency reads by placing replicas close to users in different geographic locations. Second, it provides disaster recovery by surviving complete region failures without data loss. Third, it allows you to comply with data residency requirements by pinning specific data to particular regions.

## Installing the CockroachDB Operator

Start by deploying the CockroachDB Kubernetes operator, which manages the lifecycle of CockroachDB clusters:

```bash
# Clone the official CockroachDB Helm charts
git clone https://github.com/cockroachdb/helm-charts.git

# Install the operator in a dedicated namespace
kubectl create namespace cockroach-operator-system

helm install cockroachdb-operator \
  ./helm-charts/cockroachdb-parent/charts/operator \
  --namespace cockroach-operator-system

# Verify the operator is running
kubectl get pods -n cockroach-operator-system
```

The operator watches CockroachDB custom resources and manages nodes, Services, and certificates automatically.

## Configuring Multi-Region Infrastructure

Before deploying CockroachDB, ensure your Kubernetes clusters span multiple regions with proper network connectivity. You need either a single Kubernetes cluster with nodes in multiple regions or a multi-cluster setup with cross-cluster networking.

For this guide, we'll use a single cluster with nodes labeled by region:

```bash
# Label nodes by region
kubectl label nodes node-1 node-2 node-3 \
  topology.kubernetes.io/region=us-west-2
kubectl label nodes node-1 topology.kubernetes.io/zone=us-west-2a
kubectl label nodes node-2 topology.kubernetes.io/zone=us-west-2b
kubectl label nodes node-3 topology.kubernetes.io/zone=us-west-2c

kubectl label nodes node-4 node-5 node-6 \
  topology.kubernetes.io/region=us-east-1
kubectl label nodes node-4 topology.kubernetes.io/zone=us-east-1a
kubectl label nodes node-5 topology.kubernetes.io/zone=us-east-1b
kubectl label nodes node-6 topology.kubernetes.io/zone=us-east-1c

kubectl label nodes node-7 node-8 node-9 \
  topology.kubernetes.io/region=eu-west-1
kubectl label nodes node-7 topology.kubernetes.io/zone=eu-west-1a
kubectl label nodes node-8 topology.kubernetes.io/zone=eu-west-1b
kubectl label nodes node-9 topology.kubernetes.io/zone=eu-west-1c

# Verify node labels
kubectl get nodes -L topology.kubernetes.io/region,topology.kubernetes.io/zone
```

Create a namespace for your CockroachDB cluster:

```bash
kubectl create namespace cockroachdb

# Label the namespace for bookkeeping
kubectl label namespace cockroachdb \
  topology.kubernetes.io/region=multi
```

## Deploying a Multi-Region Cluster

Create a Helm values file defining your multi-region topology:

```yaml
# cockroach-multi-region-values.yaml
cockroachdb:
  tls:
    enabled: true
    selfSigner:
      enabled: true

  crdbCluster:
    # Multi-region topology configuration
    regions:
      - code: us-west-2
        nodes: 3
        cloudProvider: aws
        namespace: cockroachdb

      - code: us-east-1
        nodes: 3
        cloudProvider: aws
        namespace: cockroachdb

      - code: eu-west-1
        nodes: 3
        cloudProvider: aws
        namespace: cockroachdb

    localityMappings:
      - nodeLabel: topology.kubernetes.io/region
        localityLabel: region
      - nodeLabel: topology.kubernetes.io/zone
        localityLabel: zone

    startFlags:
      upsert:
        - --max-sql-memory=25%
        - --cache=25%
        - --max-disk-temp-storage=100GiB

    dataStore:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
          storageClassName: fast-ssd

    service:
      ingress:
        enabled: true
        sql:
          ingressClassName: nginx
          host: cockroachdb.example.com
        ui:
          ingressClassName: nginx
          host: cockroachdb-admin.example.com

    podTemplate:
      spec:
        containers:
          - name: cockroachdb
            resources:
              requests:
                cpu: "2"
                memory: "8Gi"
              limits:
                cpu: "4"
                memory: "16Gi"
        topologySpreadConstraints:
          - maxSkew: 1
            topologyKey: topology.kubernetes.io/zone
            whenUnsatisfiable: DoNotSchedule
```

Apply the configuration:

```bash
helm install cockroachdb-multi-region \
  ./helm-charts/cockroachdb-parent/charts/cockroachdb \
  --namespace cockroachdb \
  --values cockroach-multi-region-values.yaml

# Watch the cluster come up
kubectl get pods -n cockroachdb -w
```

The operator creates CockroachDB nodes for each configured region and initializes the cluster automatically. This process takes several minutes as nodes join the cluster and perform initial replication.

## Configuring Regional Database Schemas

Once the cluster is running, configure regional schemas to optimize performance:

```bash
# Connect to the CockroachDB SQL shell
POD=$(kubectl get pods -n cockroachdb \
  -l app.kubernetes.io/component=cockroachdb \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it "$POD" -n cockroachdb \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs
```

Inside the SQL shell, set up the multi-region database:

```sql
CREATE DATABASE myapp PRIMARY REGION "us-west-2" REGIONS "us-west-2", "us-east-1", "eu-west-1";

-- Set survival mode
ALTER DATABASE myapp SURVIVE REGION FAILURE;

-- Create regional tables
USE myapp;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL,
  name STRING
) LOCALITY REGIONAL BY ROW;

-- CockroachDB adds a hidden crdb_region column to determine row placement
CREATE TABLE us_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT now()
) LOCALITY REGIONAL BY TABLE IN "us-west-2";

-- Global tables replicate to all regions for low-latency reads
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name STRING NOT NULL,
  price DECIMAL(10,2)
) LOCALITY GLOBAL;
```

This configuration enables CockroachDB to automatically place data based on access patterns. Regional tables stay close to users, while global tables provide fast reads everywhere.

## Setting Up Automated Backups

Configure an automated backup schedule to cloud storage for disaster recovery:

```sql
CREATE SCHEDULE myapp_daily_backup
  FOR BACKUP DATABASE myapp INTO 's3://my-backups/cockroachdb?AWS_ACCESS_KEY_ID={AWS_KEY}&AWS_SECRET_ACCESS_KEY={AWS_SECRET}'
  WITH revision_history
  RECURRING '0 2 * * *';
```

This schedule runs daily incremental backups to S3 and creates full backups on the default cadence, maintaining point-in-time recovery capability.

## Monitoring Multi-Region Performance

Deploy Prometheus monitoring to track cluster health across regions:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cockroachdb-monitor
  namespace: cockroachdb
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: cockroachdb
  endpoints:
    - port: http
      interval: 30s
      path: /_status/vars

  namespaceSelector:
    matchNames:
      - cockroachdb
```

Create Grafana dashboards to visualize key metrics:

```yaml
# Key metrics to monitor:
# - replicas.quiescent: Should be high (data is stable)
# - queue.replicate.pending: Should be low (minimal catch-up)
# - sql.service.latency: Track cross-region query performance
# - liveness.livenodes: Verify all nodes are healthy
```

Access the built-in admin UI for cluster visualization:

```bash
kubectl port-forward svc/cockroachdb-multi-region-public -n cockroachdb 8080:8080
# Open browser to http://localhost:8080
```

The admin UI shows replica placement, query performance, and replication lag across regions.

## Implementing Regional Failover

CockroachDB automatically handles node and region failures. Test failover by simulating a region outage:

```bash
# Simulate region failure by cordoning and draining us-west-2 nodes
kubectl cordon node-1 node-2 node-3
kubectl drain node-1 node-2 node-3 \
  --ignore-daemonsets --delete-emptydir-data

# Verify cluster remains available
POD=$(kubectl get pods -n cockroachdb \
  -l app.kubernetes.io/component=cockroachdb \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it "$POD" -n cockroachdb \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --execute="SELECT * FROM myapp.users LIMIT 10;"
```

The cluster continues serving requests using replicas in the remaining regions. When the failed region recovers, nodes automatically rejoin and catch up on missed updates.

## Optimizing Cross-Region Query Performance

Reduce cross-region latency by using follower reads for eventually consistent queries:

```sql
-- Regular read (requires quorum, may cross regions)
SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000000';

-- Follower read (served by local replica, slight staleness)
SELECT * FROM users AS OF SYSTEM TIME follower_read_timestamp()
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Bounded staleness read (at most 10s stale)
SELECT * FROM users AS OF SYSTEM TIME with_max_staleness('10s')
WHERE id = '00000000-0000-0000-0000-000000000000';
```

Follower reads serve data from local replicas without requiring consensus, dramatically reducing latency for read-heavy workloads.

## Scaling the Multi-Region Cluster

Add more nodes to handle increased load:

```bash
# Scale up each region by updating the Helm values
helm upgrade cockroachdb-multi-region \
  ./helm-charts/cockroachdb-parent/charts/cockroachdb \
  --namespace cockroachdb \
  --values cockroach-multi-region-values.yaml \
  --set cockroachdb.crdbCluster.regions[0].nodes=4 \
  --set cockroachdb.crdbCluster.regions[1].nodes=4 \
  --set cockroachdb.crdbCluster.regions[2].nodes=4
```

The operator handles rolling updates, ensuring the cluster remains available during scaling operations.

## Managing Data Residency and Compliance

Pin sensitive data to specific regions for GDPR and other regulations:

```sql
-- Create region-specific database for EU data
CREATE DATABASE eu_data PRIMARY REGION "eu-west-1" REGIONS "eu-west-1";
ALTER DATABASE eu_data SURVIVE ZONE FAILURE;

-- All tables in this database stay in EU
USE eu_data;
CREATE TABLE eu_users (
  id UUID PRIMARY KEY,
  email STRING,
  data JSONB
);

-- Verify data placement
SHOW RANGES FROM TABLE eu_users;
```

This keeps the database's replicas within the configured EU database region, satisfying data residency requirements when the underlying nodes and backups are also constrained to EU locations.

## Conclusion

Deploying CockroachDB across multiple Kubernetes regions provides a powerful combination of geographic distribution, automatic failover, and strong consistency. The CockroachDB operator simplifies management by handling node lifecycle, certificates, and cluster initialization automatically.

The key to success is proper planning of regional topology and data placement strategies. By using regional tables for localized data, global tables for reference data, and follower reads for eventually consistent queries, you optimize both performance and resilience. This architecture enables applications to survive complete region failures while maintaining low query latency for users worldwide.

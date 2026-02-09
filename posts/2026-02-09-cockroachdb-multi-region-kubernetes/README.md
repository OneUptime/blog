# How to Deploy CockroachDB with Multi-Region Topology on Kubernetes Using the Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, Databases

Description: Learn how to deploy CockroachDB in a multi-region Kubernetes configuration using the CockroachDB operator for geo-distributed, highly available database clusters with automated failover.

---

CockroachDB excels at multi-region deployments, providing strong consistency across geographic locations while surviving complete datacenter failures. When deployed on Kubernetes across multiple regions, it combines Kubernetes orchestration with CockroachDB's built-in geo-distribution capabilities. This guide walks through deploying a production-ready multi-region CockroachDB cluster using the official operator.

## Understanding CockroachDB Multi-Region Architecture

CockroachDB uses a distributed architecture where data is automatically replicated across multiple regions. Each region contains multiple nodes, and data is sharded across the cluster with configurable replica placement. The system survives region failures by maintaining at least three replicas distributed across different failure domains.

The multi-region setup provides three key benefits. First, it enables low-latency reads by placing replicas close to users in different geographic locations. Second, it provides disaster recovery by surviving complete region failures without data loss. Third, it allows you to comply with data residency requirements by pinning specific data to particular regions.

## Installing the CockroachDB Operator

Start by deploying the CockroachDB Kubernetes operator, which manages the lifecycle of CockroachDB clusters:

```bash
# Add the CockroachDB Helm repository
helm repo add cockroachdb https://charts.cockroachdb.com/
helm repo update

# Install the operator in a dedicated namespace
kubectl create namespace cockroach-operator-system

helm install cockroachdb-operator cockroachdb/cockroachdb-operator \
  --namespace cockroach-operator-system \
  --set image.tag=v2.11.0

# Verify the operator is running
kubectl get pods -n cockroach-operator-system
```

The operator watches for CrdbCluster custom resources and manages StatefulSets, Services, and certificates automatically.

## Configuring Multi-Region Infrastructure

Before deploying CockroachDB, ensure your Kubernetes clusters span multiple regions with proper network connectivity. You need either a single Kubernetes cluster with nodes in multiple regions or a multi-cluster setup with cross-cluster networking.

For this guide, we'll use a single cluster with nodes labeled by region:

```bash
# Label nodes by region
kubectl label nodes node-1 node-2 node-3 \
  topology.kubernetes.io/region=us-west-2
kubectl label nodes node-4 node-5 node-6 \
  topology.kubernetes.io/region=us-east-1
kubectl label nodes node-7 node-8 node-9 \
  topology.kubernetes.io/region=eu-west-1

# Verify node labels
kubectl get nodes -L topology.kubernetes.io/region
```

Create a namespace for your CockroachDB cluster:

```bash
kubectl create namespace cockroachdb

# Label the namespace for multi-region awareness
kubectl label namespace cockroachdb \
  topology.kubernetes.io/region=multi
```

## Deploying a Multi-Region Cluster

Create a CrdbCluster custom resource defining your multi-region topology:

```yaml
# cockroach-multi-region.yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb-multi-region
  namespace: cockroachdb
spec:
  # Total number of nodes across all regions
  nodes: 9

  # Resource allocation per node
  resources:
    requests:
      cpu: "2"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "16Gi"

  # Storage configuration
  dataStore:
    pvc:
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd

  # Multi-region topology configuration
  topology:
    regions:
      - name: us-west-2
        nodeCount: 3
        nodeSelector:
          topology.kubernetes.io/region: us-west-2

      - name: us-east-1
        nodeCount: 3
        nodeSelector:
          topology.kubernetes.io/region: us-east-1

      - name: eu-west-1
        nodeCount: 3
        nodeSelector:
          topology.kubernetes.io/region: eu-west-1

  # TLS configuration (highly recommended for production)
  tlsEnabled: true

  # Additional CockroachDB configuration
  additionalArgs:
    - --locality=region=us-west-2,zone=a  # Set via topology
    - --max-sql-memory=25%
    - --cache=25%
    - --max-disk-temp-storage=100GiB

  # Enable automatic certificate management
  clientTLSSecret: cockroachdb-client-tls
  nodeTLSSecret: cockroachdb-node-tls

  # Ingress configuration for SQL clients
  ingress:
    enabled: true
    annotations:
      kubernetes.io/ingress.class: nginx
    sql:
      enabled: true
      host: cockroachdb.example.com
    ui:
      enabled: true
      host: cockroachdb-admin.example.com
```

Apply the configuration:

```bash
kubectl apply -f cockroach-multi-region.yaml

# Watch the cluster come up
kubectl get pods -n cockroachdb -w
```

The operator creates three StatefulSets, one per region, and initializes the cluster automatically. This process takes 5-10 minutes as nodes join the cluster and perform initial replication.

## Configuring Regional Database Schemas

Once the cluster is running, configure regional schemas to optimize performance:

```bash
# Connect to the CockroachDB SQL shell
kubectl exec -it cockroachdb-multi-region-0 -n cockroachdb \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs

# Inside the SQL shell, set up multi-region database
CREATE DATABASE myapp PRIMARY REGION "us-west-2" REGIONS "us-east-1", "eu-west-1";

# Set survival mode
ALTER DATABASE myapp SURVIVE REGION FAILURE;

# Create regional tables
USE myapp;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL,
  name STRING,
  region STRING NOT NULL
) LOCALITY REGIONAL BY ROW;

# The 'region' column automatically determines replica placement
CREATE TABLE us_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT now()
) LOCALITY REGIONAL BY TABLE IN "us-west-2";

# Global tables replicate to all regions for low-latency reads
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name STRING NOT NULL,
  price DECIMAL(10,2)
) LOCALITY GLOBAL;
```

This configuration enables CockroachDB to automatically place data based on access patterns. Regional tables stay close to users, while global tables provide fast reads everywhere.

## Setting Up Automated Backups

Configure automated backups to cloud storage for disaster recovery:

```yaml
# backup-schedule.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cockroachdb-backup
  namespace: cockroachdb
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: cockroachdb/cockroach:v23.1.0
              command:
                - /bin/bash
                - -c
                - |
                  ./cockroach sql \
                    --certs-dir=/cockroach/cockroach-certs \
                    --host=cockroachdb-multi-region-public.cockroachdb:26257 \
                    --execute="BACKUP DATABASE myapp TO 's3://my-backups/cockroachdb?AWS_ACCESS_KEY_ID=${AWS_KEY}&AWS_SECRET_ACCESS_KEY=${AWS_SECRET}' AS OF SYSTEM TIME '-10s' WITH revision_history;"
              env:
                - name: AWS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key-id
                - name: AWS_SECRET
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-access-key
              volumeMounts:
                - name: client-certs
                  mountPath: /cockroach/cockroach-certs
          volumes:
            - name: client-certs
              secret:
                secretName: cockroachdb-client-tls
          restartPolicy: OnFailure
```

This CronJob runs daily incremental backups to S3, maintaining point-in-time recovery capability.

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
      app: cockroachdb
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
# - replication_quiescent: Should be high (data is stable)
# - replication_pending: Should be low (minimal catch-up)
# - sql_query_latency_p99: Track cross-region query performance
# - liveness_livenodes: Verify all nodes are healthy
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
# Simulate region failure by scaling down us-west-2 nodes
kubectl scale statefulset cockroachdb-multi-region-us-west-2 \
  --replicas=0 -n cockroachdb

# Verify cluster remains available
kubectl exec -it cockroachdb-multi-region-0 -n cockroachdb \
  -- ./cockroach sql --certs-dir=/cockroach/cockroach-certs \
  --execute="SELECT * FROM myapp.users LIMIT 10;"
```

The cluster continues serving requests using replicas in the remaining regions. When the failed region recovers, nodes automatically rejoin and catch up on missed updates.

## Optimizing Cross-Region Query Performance

Reduce cross-region latency by using follower reads for eventually consistent queries:

```sql
-- Regular read (requires quorum, may cross regions)
SELECT * FROM users WHERE id = 'some-uuid';

-- Follower read (served by local replica, slight staleness)
SELECT * FROM users AS OF SYSTEM TIME follower_read_timestamp()
WHERE id = 'some-uuid';

-- Bounded staleness read (at most 10s stale)
SELECT * FROM users AS OF SYSTEM TIME with_max_staleness('10s')
WHERE id = 'some-uuid';
```

Follower reads serve data from local replicas without requiring consensus, dramatically reducing latency for read-heavy workloads.

## Scaling the Multi-Region Cluster

Add more nodes to handle increased load:

```bash
# Scale up each region by editing the CrdbCluster resource
kubectl patch crdbcluster cockroachdb-multi-region -n cockroachdb \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/nodes", "value": 12}]'

# Update region node counts
kubectl patch crdbcluster cockroachdb-multi-region -n cockroachdb \
  --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/topology/regions/0/nodeCount", "value": 4},
    {"op": "replace", "path": "/spec/topology/regions/1/nodeCount", "value": 4},
    {"op": "replace", "path": "/spec/topology/regions/2/nodeCount", "value": 4}
  ]'
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

This ensures EU customer data never leaves the EU region, satisfying data residency requirements.

## Conclusion

Deploying CockroachDB across multiple Kubernetes regions provides a powerful combination of geographic distribution, automatic failover, and strong consistency. The CockroachDB operator simplifies management by handling node lifecycle, certificates, and cluster initialization automatically.

The key to success is proper planning of regional topology and data placement strategies. By using regional tables for localized data, global tables for reference data, and follower reads for eventually consistent queries, you optimize both performance and resilience. This architecture enables applications to survive complete region failures while maintaining low query latency for users worldwide.

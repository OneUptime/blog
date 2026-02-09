# How to Deploy CockroachDB with Multi-Region Topology Using the CockroachDB Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, Multi-Region, Operators, Database

Description: Learn how to deploy CockroachDB with multi-region topology on Kubernetes using the CockroachDB Operator for geo-distributed databases with survival goals and data domiciling.

---

CockroachDB excels at geo-distributed deployments, providing strong consistency across multiple regions while maintaining high availability. The CockroachDB Operator simplifies deploying multi-region clusters on Kubernetes, automating complex configuration and enabling features like survival goals and data domiciling.

In this guide, we'll deploy a multi-region CockroachDB cluster using the operator on Kubernetes. We'll cover cluster topology design, survival goals, partition strategies, and application connection patterns.

## Understanding CockroachDB Multi-Region Architecture

CockroachDB's multi-region capabilities provide:

- Survival goals (zone, region failure tolerance)
- Data domiciling for compliance requirements
- Low-latency reads through replica placement
- Automatic rebalancing across regions
- Strong consistency guarantees globally

A typical multi-region topology includes nodes across 3+ regions with strategic replica placement based on survival requirements.

## Installing the CockroachDB Operator

Deploy the operator in your Kubernetes clusters:

```bash
# Apply the operator
kubectl apply -f https://raw.githubusercontent.com/cockroachdb/cockroach-operator/master/install/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/cockroachdb/cockroach-operator/master/install/operator.yaml

# Verify operator is running
kubectl get pods -n cockroach-operator-system
```

## Deploying Multi-Region Cluster

Create a CockroachDB cluster spanning multiple regions:

```yaml
# cockroachdb-multiregion.yaml
apiVersion: crdb.cockroachlabs.com/v1alpha1
kind: CrdbCluster
metadata:
  name: cockroachdb-multi
  namespace: cockroachdb
spec:
  dataStore:
    pvc:
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 200Gi
        storageClassName: fast-ssd

  resources:
    requests:
      cpu: 4
      memory: 8Gi
    limits:
      cpu: 8
      memory: 16Gi

  tlsEnabled: true

  image:
    name: cockroachdb/cockroach:v23.1.0

  nodes: 9

  # Multi-region topology
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app.kubernetes.io/name: cockroachdb

  nodeSelector:
    workload: database

  additionalAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"

  cluster:
    settings:
    - name: cluster.organization
      value: "your-organization"
    - name: enterprise.license
      value: "your-license-key"
    - name: kv.range_split.by_load.enabled
      value: "true"
    - name: kv.allocator.load_based_rebalancing
      value: "true"
```

Deploy in each region:

```bash
# Region 1 (us-east-1)
kubectl apply -f cockroachdb-multiregion.yaml --context us-east-1

# Region 2 (us-west-2)
kubectl apply -f cockroachdb-multiregion.yaml --context us-west-2

# Region 3 (eu-west-1)
kubectl apply -f cockroachdb-multiregion.yaml --context eu-west-1
```

## Configuring Survival Goals

Set survival goals for your database:

```sql
-- Connect to cluster
cockroach sql --url "postgresql://root@cockroachdb-multi-public:26257/defaultdb?sslmode=verify-full"

-- View current regions
SELECT * FROM [SHOW REGIONS FROM CLUSTER];

-- Add regions
ALTER DATABASE movr SET PRIMARY REGION "us-east-1";
ALTER DATABASE movr ADD REGION "us-west-2";
ALTER DATABASE movr ADD REGION "eu-west-1";

-- Set survival goal - survive zone failure
ALTER DATABASE movr SURVIVE ZONE FAILURE;

-- Or survive region failure (requires 5 regions minimum)
-- ALTER DATABASE movr SURVIVE REGION FAILURE;

-- View database regions
SHOW REGIONS FROM DATABASE movr;
```

## Implementing Table Localities

Configure table locality for optimal performance:

```sql
-- Regional by row (data domiciled by region)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email STRING NOT NULL,
    name STRING,
    region crdb_internal_region AS (
        CASE
            WHEN email LIKE '%@us.%' THEN 'us-east-1'
            WHEN email LIKE '%@eu.%' THEN 'eu-west-1'
            ELSE 'us-west-2'
        END
    ) STORED,
    INDEX (email),
    UNIQUE (email)
) LOCALITY REGIONAL BY ROW AS region;

-- Regional table (single region for entire table)
CREATE TABLE eu_compliance_data (
    id UUID PRIMARY KEY,
    data JSONB
) LOCALITY REGIONAL BY TABLE IN "eu-west-1";

-- Global table (replicated to all regions for fast reads)
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name STRING,
    price DECIMAL(10,2)
) LOCALITY GLOBAL;
```

## Application Connection Patterns

Connect applications to the nearest region for low latency:

```go
// main.go - Go application example
package main

import (
    "database/sql"
    "fmt"
    _ "github.com/lib/pq"
)

func main() {
    // Connection string with locality hints
    connStr := "postgresql://app_user:password@cockroachdb-multi-public.cockroachdb.svc.cluster.local:26257/movr?" +
        "sslmode=require&" +
        "application_name=movr_app&" +
        "options=--cluster%3Dregion%3Dus-east-1"

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Set connection pool settings
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(25)
    db.SetConnMaxLifetime(0)

    // Test connection
    if err := db.Ping(); err != nil {
        panic(err)
    }

    fmt.Println("Connected to CockroachDB")
}
```

## Monitoring Multi-Region Performance

Track cross-region latency and replication lag:

```sql
-- Check replication status
SELECT
    zone_id,
    target,
    type,
    config
FROM [SHOW ZONE CONFIGURATIONS]
WHERE target LIKE '%movr%';

-- View range distribution
SELECT
    start_key,
    end_key,
    replicas,
    lease_holder
FROM crdb_internal.ranges
WHERE database_name = 'movr'
LIMIT 10;

-- Monitor query latency by region
SELECT
    node_id,
    user_name,
    application_name,
    ROUND(AVG(latency), 2) as avg_latency_ms
FROM crdb_internal.node_statement_statistics
GROUP BY node_id, user_name, application_name
ORDER BY avg_latency_ms DESC;
```

## Testing Region Failover

Simulate region failure:

```bash
# Identify nodes in us-east-1
kubectl get pods -n cockroachdb -o wide --context us-east-1

# Drain region (graceful)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --context us-east-1

# Verify cluster still operational
cockroach sql --url "postgresql://root@cockroachdb-multi-public:26257/defaultdb?sslmode=verify-full" \
  --execute="SELECT count(*) FROM movr.users"

# Check replica rebalancing
cockroach sql --url "postgresql://root@cockroachdb-multi-public:26257/defaultdb?sslmode=verify-full" \
  --execute="SHOW RANGES FROM TABLE movr.users"
```

## Implementing Follower Reads

Enable follower reads for better read scalability:

```sql
-- Enable follower reads at session level
SET enable_experimental_follower_reads = true;

-- Query with AS OF SYSTEM TIME for follower reads
SELECT * FROM users
AS OF SYSTEM TIME follower_read_timestamp()
WHERE region = 'us-east-1';

-- For applications, use connection parameter
-- postgresql://...?options=--cluster%3Denable_experimental_follower_reads%3Dtrue
```

## Backup Strategy for Multi-Region

Create region-aware backup strategy:

```sql
-- Full backup to cloud storage
BACKUP DATABASE movr
INTO 's3://cockroachdb-backups/full?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
WITH REVISION_HISTORY;

-- Regional backup (single region)
BACKUP TABLE movr.eu_compliance_data
INTO 's3://cockroachdb-backups-eu/regional?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx';

-- Scheduled backups
CREATE SCHEDULE multi_region_backup
FOR BACKUP DATABASE movr
INTO 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
RECURRING '@daily'
WITH SCHEDULE OPTIONS first_run = 'now';
```

## Conclusion

Deploying CockroachDB with multi-region topology on Kubernetes provides globally distributed databases with strong consistency guarantees. The CockroachDB Operator simplifies operations while enabling advanced features like survival goals, data domiciling, and automatic failover across regions.

Key takeaways:

- Use at least 3 regions for proper fault tolerance
- Configure survival goals based on availability requirements
- Implement appropriate table locality strategies
- Enable follower reads for read-heavy workloads
- Monitor cross-region latency and replication lag
- Test failover procedures regularly

With CockroachDB's multi-region capabilities and Kubernetes orchestration, you can build applications that serve global users with low latency while maintaining data compliance and high availability standards.

# How to Use ClickHouse Cloud vs Self-Hosted ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Self-Hosted, Deployment, DevOps

Description: Compare ClickHouse Cloud and self-hosted ClickHouse across cost, operations, performance, and features to decide which deployment model fits your team's needs.

## Introduction

ClickHouse can be deployed in two primary ways: **ClickHouse Cloud**, the managed service offered by ClickHouse Inc., or **self-hosted**, where your team manages the installation, configuration, and operations yourself on any infrastructure.

Both options run the same core ClickHouse engine with the same SQL dialect, table engines, and query capabilities. The difference is in who operates the cluster and how resources are managed. This guide compares both options across the dimensions that matter for production decisions.

## ClickHouse Cloud

ClickHouse Cloud is a fully managed SaaS offering available on AWS, GCP, and Azure.

### Key Features

- **Serverless autoscaling** - compute scales up and down automatically based on query load; you are only charged for what you use
- **Separation of storage and compute** - data is stored in object storage (S3 or GCS); compute nodes are ephemeral
- **Automatic backups** - daily backups with point-in-time restore
- **Built-in ClickHouse Keeper** - no coordination service to manage
- **Zero-downtime upgrades** - ClickHouse Inc. manages version upgrades
- **Tiered storage** - automatically moves cold data to cheaper object storage
- **SQL Console** - web-based query interface included

### Getting Started with ClickHouse Cloud

```bash
# Connect with clickhouse-client
clickhouse-client \
    --host your-instance.clickhouse.cloud \
    --port 9440 \
    --secure \
    --user default \
    --password 'your-password'
```

Or via HTTPS:

```bash
curl 'https://your-instance.clickhouse.cloud:8443/?query=SELECT+version()' \
    --user 'default:your-password'
```

Creating a table works identically to self-hosted:

```sql
CREATE TABLE events
(
    event_id    UUID DEFAULT generateUUIDv4(),
    occurred_at DateTime,
    user_id     String,
    event_type  LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (user_id, occurred_at);
```

ClickHouse Cloud uses `SharedMergeTree` internally (a cloud-optimized variant of `ReplicatedMergeTree`) but you create tables using `MergeTree` syntax and the engine is automatically upgraded.

### ClickHouse Cloud Service Tiers

```text
Development:
  - Fixed small instance
  - Not highly available
  - Good for prototyping and testing

Production:
  - Autoscaling compute
  - Multi-replica (HA)
  - SLA-backed
  - Choose AWS/GCP/Azure and region
```

### ClickHouse Cloud Pricing Model

ClickHouse Cloud charges based on:
- **Compute units** - the amount of vCPU and memory used while queries are running (per minute)
- **Storage** - GBs stored in object storage (per GB per month)
- **Network** - data transfer out (per GB)

When a service is idle (no queries), compute scales to zero and you only pay for storage.

## Self-Hosted ClickHouse

Self-hosted means you install and operate ClickHouse on your own servers, whether on-premises, VMs, or Kubernetes.

### Installation Options

**Debian/Ubuntu:**

```bash
sudo apt-get install -y apt-transport-https ca-certificates dirmngr
GNUPGHOME=$(mktemp -d)
sudo GNUPGHOME="$GNUPGHOME" gpg --no-default-keyring \
    --keyring /usr/share/keyrings/clickhouse-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 \
    --recv-keys 8919F6BD2B48D754

echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" \
    | sudo tee /etc/apt/sources.list.d/clickhouse.list

sudo apt-get update
sudo apt-get install -y clickhouse-server clickhouse-client

sudo service clickhouse-server start
clickhouse-client
```

**Docker:**

```bash
docker run -d \
    --name clickhouse-server \
    -p 9000:9000 \
    -p 8123:8123 \
    -v /path/to/data:/var/lib/clickhouse \
    -v /path/to/config:/etc/clickhouse-server \
    clickhouse/clickhouse-server:latest
```

**Kubernetes with Helm:**

```bash
helm repo add clickhouse-operator https://helm.altinity.com

helm install clickhouse-operator \
    clickhouse-operator/clickhouse-operator \
    --namespace clickhouse-operator \
    --create-namespace
```

### Minimal Single-Node Configuration

```xml
<!-- /etc/clickhouse-server/config.d/custom.xml -->
<clickhouse>
    <logger>
        <level>information</level>
        <log>/var/log/clickhouse-server/clickhouse-server.log</log>
        <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
        <size>1000M</size>
        <count>10</count>
    </logger>

    <max_connections>4096</max_connections>
    <max_concurrent_queries>100</max_concurrent_queries>

    <path>/var/lib/clickhouse/</path>
    <tmp_path>/var/lib/clickhouse/tmp/</tmp_path>

    <listen_host>0.0.0.0</listen_host>
    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
</clickhouse>
```

### Production Cluster Configuration

For a production self-hosted cluster, you need:
- Minimum 3 nodes for ClickHouse Keeper (or an external ZooKeeper ensemble)
- 2+ shards with 2 replicas each for fault tolerance
- Separate monitoring (Prometheus + Grafana or similar)
- Backup strategy (clickhouse-backup or S3 exports)
- Load balancer in front for query routing

```xml
<!-- Cluster definition -->
<remote_servers>
    <production_cluster>
        <shard>
            <internal_replication>true</internal_replication>
            <replica>
                <host>ch-01.internal</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-02.internal</host>
                <port>9000</port>
            </replica>
        </shard>
        <shard>
            <internal_replication>true</internal_replication>
            <replica>
                <host>ch-03.internal</host>
                <port>9000</port>
            </replica>
            <replica>
                <host>ch-04.internal</host>
                <port>9000</port>
            </replica>
        </shard>
    </production_cluster>
</remote_servers>
```

## Feature Comparison

| Feature | ClickHouse Cloud | Self-Hosted |
|---|---|---|
| Setup time | Minutes | Hours to days |
| Operational burden | None | High |
| Autoscaling | Yes (automatic) | Manual or custom |
| High availability | Built-in | Must configure |
| Backups | Automatic | Manual setup |
| Version upgrades | Automatic | Manual |
| Custom configurations | Limited | Full control |
| Network egress costs | Yes | No (internal) |
| Data sovereignty | Cloud provider regions | Any location |
| Storage engine | SharedMergeTree | ReplicatedMergeTree |
| Keeper/ZooKeeper | Managed | Must deploy |
| SLA | Yes (production tier) | No (unless you build it) |
| Cost model | Usage-based | Infrastructure-based |

## Cost Comparison

### ClickHouse Cloud

At moderate scale (5TB storage, 50B rows queried per month):
- Storage: ~$100-200/month (S3 pricing)
- Compute: highly variable based on query frequency and complexity
- Predictable for consistent workloads, cost-efficient for bursty workloads

### Self-Hosted

At the same scale:
- EC2 instances (r6a.4xlarge x4): ~$2,000-4,000/month
- EBS storage: ~$200-500/month
- Operational engineer time: significant

Self-hosted becomes cost-competitive at very high scale (100TB+) or when you have existing infrastructure and engineering capacity.

## When to Choose ClickHouse Cloud

- Your team does not have ClickHouse operations expertise
- You need to be productive quickly without infrastructure setup
- Workloads are bursty or unpredictable (autoscaling saves cost)
- You want automatic upgrades and security patching
- Data resides in a cloud provider already (minimize egress)

## When to Choose Self-Hosted

- Data sovereignty requirements prevent cloud storage
- Very high and consistent workload makes fixed infrastructure cheaper
- You need custom configurations not available in managed services
- You are integrating with on-premises data sources with low latency requirements
- Your team already operates other databases and has the capacity

## Migrating from Self-Hosted to ClickHouse Cloud

```bash
# Use clickhouse-client to export and reimport
clickhouse-client --query "SELECT * FROM events FORMAT Native" \
    | clickhouse-client \
        --host cloud-instance.clickhouse.cloud \
        --secure \
        --user default \
        --password 'password' \
        --query "INSERT INTO events FORMAT Native"
```

For large tables, export to S3 first then import from S3:

```sql
-- On self-hosted: export to S3
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/my-bucket/events/export_{_partition_id}.parquet',
    'Parquet'
)
PARTITION BY toYYYYMM(occurred_at)
SELECT * FROM events;

-- On ClickHouse Cloud: import from S3
INSERT INTO events
SELECT * FROM s3(
    'https://s3.amazonaws.com/my-bucket/events/*.parquet',
    'Parquet'
);
```

## Monitoring

**ClickHouse Cloud** provides a built-in monitoring dashboard in the web console showing query history, resource utilization, and cost breakdown.

**Self-hosted** requires setting up your own monitoring stack:

```bash
# Enable Prometheus metrics endpoint
# In config.xml:
# <prometheus>
#     <endpoint>/metrics</endpoint>
#     <port>9363</port>
# </prometheus>

# Scrape with Prometheus, visualize with Grafana
# Use the community ClickHouse Grafana dashboard (ID: 14192)
```

Key metrics to monitor in both deployments:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric IN (
    'Query',
    'BackgroundMergesAndMutationsPoolTask',
    'ReplicatedChecks',
    'ZooKeeperRequest'
);
```

## Conclusion

ClickHouse Cloud is the faster path to production and the better choice when operational simplicity outweighs cost at scale. Self-hosted is appropriate when you have the engineering capacity, specific compliance requirements, or scale that makes fixed infrastructure cheaper. Both run the same ClickHouse engine, so your SQL, schemas, and query patterns are fully portable between the two.

**Related Reading:**

- [What Is ClickHouse Keeper and Why You Need It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-keeper-explained/view)
- [What Is Distributed Table Engine and How It Routes Queries](https://oneuptime.com/blog/post/2026-03-31-clickhouse-distributed-table-engine/view)
- [What Is TTL in ClickHouse and How Data Lifecycle Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ttl-data-lifecycle/view)

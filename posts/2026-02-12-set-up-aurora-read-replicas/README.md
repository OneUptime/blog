# How to Set Up Aurora Read Replicas

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Aurora, Read Replicas, Database, Scaling

Description: Learn how to add and manage Aurora read replicas for horizontal read scaling, including auto scaling, endpoint configuration, and application routing.

---

One of Aurora's biggest advantages over standard RDS is how easy it is to add read replicas. Since all instances in an Aurora cluster share the same storage volume, creating a new replica doesn't require copying data. It takes minutes instead of hours, and the replica is immediately in sync with near-zero lag.

If your application is read-heavy (and most are), spreading reads across multiple replicas lets you handle significantly more traffic without touching the writer instance. Let's walk through setting up replicas, configuring your application to use them, and auto-scaling based on demand.

## How Aurora Read Replicas Differ from Standard RDS Replicas

In standard RDS, a read replica gets its data through asynchronous replication from the primary. This means:
- Replica lag can be seconds to minutes
- Each replica has its own copy of the data on its own EBS volume
- Creating a replica involves copying the entire database

In Aurora, read replicas share the same storage volume as the writer:
- Replica lag is typically 10-20 milliseconds
- No data copying needed to create a replica
- Up to 15 read replicas per cluster (vs. 5 for standard RDS)
- Any replica can be promoted to writer during failover

## Adding a Read Replica

Adding a replica to an existing Aurora cluster is straightforward:

```bash
# Add a read replica to an Aurora cluster
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-reader-3 \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql \
  --db-parameter-group-name myapp-aurora-pg16-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --promotion-tier 2 \
  --availability-zone us-east-1c
```

The replica becomes available in a few minutes. No data needs to be copied since it shares the cluster's storage volume.

## Choosing Instance Sizes for Replicas

Replicas don't need to be the same size as the writer. You have flexibility:

- **Same size as writer**: Good when any replica might need to take over as writer during failover
- **Smaller than writer**: Good for cost savings when read workload is lighter
- **Larger than writer**: Rare, but useful if your read queries are more resource-intensive than writes
- **Mix of sizes**: You can have different sizes for different replicas

```bash
# High-priority failover replica - same size as writer
aws rds create-db-instance \
  --db-instance-identifier myapp-reader-primary-failover \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-postgresql \
  --promotion-tier 0

# Cost-optimized readers for general read traffic
aws rds create-db-instance \
  --db-instance-identifier myapp-reader-general-1 \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql \
  --promotion-tier 5
```

## Using the Reader Endpoint

Aurora provides a reader endpoint that automatically load-balances connections across all available readers:

```bash
# Get the reader endpoint
aws rds describe-db-clusters \
  --db-cluster-identifier myapp-aurora-cluster \
  --query 'DBClusters[0].ReaderEndpoint'
```

The reader endpoint uses DNS round-robin to distribute connections. This means each new connection goes to a different reader, but once a connection is established, it stays on the same reader for the duration of that connection.

For connection pools, this means the distribution happens when pool connections are created, not per-query. To get good distribution, make sure your connection pool refreshes connections periodically:

```python
from sqlalchemy import create_engine

# Configure the connection pool to recycle connections every 30 minutes
# This ensures load gets redistributed across readers
read_engine = create_engine(
    'postgresql://readonly:password@myapp-aurora-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com:5432/myapp',
    pool_size=20,
    pool_recycle=1800,  # Recycle connections every 30 minutes
    pool_pre_ping=True,  # Verify connections are alive before using
    connect_args={
        'sslmode': 'require',
        'sslrootcert': '/path/to/global-bundle.pem'
    }
)
```

## Custom Endpoints

For more control over which readers handle which traffic, create custom endpoints:

```bash
# Create a custom endpoint for analytics queries (targets larger instances)
aws rds create-db-cluster-endpoint \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-cluster-endpoint-identifier analytics-endpoint \
  --endpoint-type READER \
  --static-members myapp-reader-analytics-1 myapp-reader-analytics-2

# Create a custom endpoint for general application reads
aws rds create-db-cluster-endpoint \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-cluster-endpoint-identifier app-reads-endpoint \
  --endpoint-type READER \
  --static-members myapp-reader-general-1 myapp-reader-general-2 myapp-reader-general-3
```

With custom endpoints, you can route different workloads to different sets of readers:

```python
# Route analytics queries to dedicated analytics readers
analytics_engine = create_engine(
    'postgresql://readonly:password@analytics-endpoint.cluster-custom-abc123.us-east-1.rds.amazonaws.com:5432/myapp',
    pool_size=5
)

# Route application reads to general readers
app_read_engine = create_engine(
    'postgresql://readonly:password@app-reads-endpoint.cluster-custom-abc123.us-east-1.rds.amazonaws.com:5432/myapp',
    pool_size=30
)
```

This prevents heavy analytics queries from affecting your application's read performance.

## Aurora Auto Scaling for Readers

Instead of manually adding and removing readers, you can set up auto scaling to add readers based on demand:

```bash
# Register the Aurora cluster as a scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace rds \
  --resource-id cluster:myapp-aurora-cluster \
  --scalable-dimension rds:cluster:ReadReplicaCount \
  --min-capacity 1 \
  --max-capacity 8

# Create a scaling policy based on CPU utilization
aws application-autoscaling put-scaling-policy \
  --policy-name aurora-cpu-scaling \
  --service-namespace rds \
  --resource-id cluster:myapp-aurora-cluster \
  --scalable-dimension rds:cluster:ReadReplicaCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "RDSReaderAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 120
  }'
```

This policy maintains average reader CPU at 70%. When CPU goes above 70%, Aurora adds readers. When it drops below, it removes them (respecting the minimum of 1).

You can also scale based on database connections:

```bash
# Scale based on average connections per reader
aws application-autoscaling put-scaling-policy \
  --policy-name aurora-connections-scaling \
  --service-namespace rds \
  --resource-id cluster:myapp-aurora-cluster \
  --scalable-dimension rds:cluster:ReadReplicaCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 500.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "RDSReaderAverageDatabaseConnections"
    },
    "ScaleInCooldown": 600,
    "ScaleOutCooldown": 180
  }'
```

## Failover Priority

Each reader has a promotion tier (0-15) that determines its priority during failover:

```bash
# Set tier 0 for the highest-priority failover target
aws rds modify-db-instance \
  --db-instance-identifier myapp-reader-primary-failover \
  --promotion-tier 0

# Set tier 5 for general readers (lower priority)
aws rds modify-db-instance \
  --db-instance-identifier myapp-reader-general-1 \
  --promotion-tier 5

# Set tier 15 for auto-scaled readers (lowest priority)
# Aurora auto-scaled instances default to tier 15
```

During failover, Aurora promotes the reader with the lowest tier number. If multiple readers have the same tier, it promotes the largest one.

Best practice: always have at least one reader at tier 0 or 1 that's the same instance class as the writer. This ensures a smooth failover without performance degradation.

## Monitoring Replicas

Watch these key metrics across your readers:

```bash
# Check replica lag across all readers
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name AuroraReplicaLag \
  --dimensions Name=DBClusterIdentifier,Value=myapp-aurora-cluster \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum Average \
  --output table
```

Set up alarms for replica health:

```bash
# Alert if replica lag exceeds 100ms
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-replica-lag-high" \
  --metric-name AuroraReplicaLag \
  --namespace AWS/RDS \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBClusterIdentifier,Value=myapp-aurora-cluster \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts

# Alert if buffer cache hit ratio drops (indicates instance is too small)
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-reader-cache-cold" \
  --metric-name BufferCacheHitRatio \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 95 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=myapp-reader-general-1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts
```

## Handling Reader Failures in Application Code

When a reader goes down, the reader endpoint stops routing to it. But existing connections to that reader will fail. Your application needs retry logic:

```python
import time
from psycopg2 import OperationalError

def resilient_read_query(sql, params=None, max_retries=3):
    """Execute a read query with retry logic for reader failures."""
    for attempt in range(max_retries):
        try:
            conn = read_pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    return cur.fetchall()
            finally:
                read_pool.putconn(conn)
        except OperationalError as e:
            if attempt == max_retries - 1:
                raise
            print(f"Read query failed (attempt {attempt + 1}), retrying: {e}")
            # Mark the bad connection for disposal
            read_pool.putconn(conn, close=True)
            time.sleep(0.5 * (attempt + 1))
```

## Cost Optimization

Aurora readers are billed at the same rate as the writer. To optimize costs:

- Use auto scaling to match capacity to demand
- Use smaller instance classes for readers when possible
- Consider Graviton-based instances (r6g/r7g) for better price-performance
- Use Reserved Instances for your baseline reader capacity and auto scaling for peaks

For more on Aurora's underlying architecture, see our deep dive on [Aurora architecture and storage](https://oneuptime.com/blog/post/understand-aurora-architecture-and-storage/view). And for monitoring your Aurora cluster effectively, check out our guides on [Performance Insights](https://oneuptime.com/blog/post/monitor-rds-with-performance-insights/view) and [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view).

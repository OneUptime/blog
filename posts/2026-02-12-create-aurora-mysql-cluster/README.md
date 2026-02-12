# How to Create an Aurora MySQL Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Aurora, MySQL, Database, High Availability

Description: Step-by-step guide to creating an Amazon Aurora MySQL cluster with writer and reader instances, security configuration, and production best practices.

---

Amazon Aurora MySQL is AWS's cloud-native MySQL-compatible database. It uses the same MySQL wire protocol and syntax, so your existing MySQL applications work without changes. But under the hood, it's a completely different architecture - distributed storage, automatic replication, and faster failover than standard RDS MySQL.

If you're starting a new project or outgrowing standard RDS MySQL, Aurora is worth considering. It costs more per hour, but you often end up with better performance and less operational overhead. Let's set up a production-ready Aurora MySQL cluster from scratch.

## Aurora MySQL vs. Standard RDS MySQL

Before diving in, here's why you'd pick Aurora:

- **Storage**: Auto-scales from 10 GB to 128 TB. No need to provision or manage storage.
- **Replication**: Up to 15 read replicas with sub-10ms replica lag (vs. seconds for standard MySQL replication).
- **Failover**: Automatic failover typically completes in under 30 seconds.
- **Durability**: 6 copies of your data across 3 Availability Zones.
- **Backups**: Continuous backup to S3 with point-in-time recovery.

The trade-off is cost. Aurora instances are roughly 20% more expensive than equivalent RDS MySQL instances, and storage pricing is different.

## Prerequisites

Make sure you have:
- A VPC with at least 2 private subnets in different AZs
- A security group for the database
- A KMS key for encryption (optional but recommended)

## Step 1: Create a DB Subnet Group

Aurora needs to know which subnets to use:

```bash
# Create a subnet group for Aurora
aws rds create-db-subnet-group \
  --db-subnet-group-name myapp-aurora-subnets \
  --db-subnet-group-description "Subnets for Aurora MySQL cluster" \
  --subnet-ids subnet-abc123 subnet-def456 subnet-ghi789
```

## Step 2: Create a Custom Parameter Group

Aurora uses cluster-level and instance-level parameter groups:

```bash
# Create a cluster parameter group
aws rds create-db-cluster-parameter-group \
  --db-cluster-parameter-group-name myapp-aurora-mysql8-cluster \
  --db-parameter-group-family aurora-mysql8.0 \
  --description "Cluster parameters for Aurora MySQL 8.0"

# Set cluster-level parameters
aws rds modify-db-cluster-parameter-group \
  --db-cluster-parameter-group-name myapp-aurora-mysql8-cluster \
  --parameters \
    "ParameterName=character_set_server,ParameterValue=utf8mb4,ApplyMethod=immediate" \
    "ParameterName=collation_server,ParameterValue=utf8mb4_unicode_ci,ApplyMethod=immediate" \
    "ParameterName=require_secure_transport,ParameterValue=ON,ApplyMethod=immediate"

# Create an instance-level parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name myapp-aurora-mysql8-instance \
  --db-parameter-group-family aurora-mysql8.0 \
  --description "Instance parameters for Aurora MySQL 8.0"

# Set instance-level parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name myapp-aurora-mysql8-instance \
  --parameters \
    "ParameterName=slow_query_log,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=long_query_time,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=log_output,ParameterValue=FILE,ApplyMethod=immediate"
```

## Step 3: Create the Aurora Cluster

The cluster is the primary resource. It manages the shared storage volume:

```bash
# Create the Aurora MySQL cluster
aws rds create-db-cluster \
  --db-cluster-identifier myapp-aurora-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.07.1 \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --db-subnet-group-name myapp-aurora-subnets \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-cluster-parameter-group-name myapp-aurora-mysql8-cluster \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id \
  --backup-retention-period 14 \
  --preferred-backup-window "02:00-03:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --enable-cloudwatch-logs-exports '["audit","error","general","slowquery"]' \
  --deletion-protection
```

## Step 4: Create the Writer Instance

The cluster itself doesn't serve traffic - you need instances. The first instance becomes the writer:

```bash
# Create the primary (writer) instance
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-writer \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-mysql \
  --db-parameter-group-name myapp-aurora-mysql8-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --auto-minor-version-upgrade
```

Wait for it to become available:

```bash
# Wait for the writer instance to be ready
aws rds wait db-instance-available \
  --db-instance-identifier myapp-aurora-writer
```

## Step 5: Add Reader Instances

Add one or more reader instances for read scaling and failover:

```bash
# Create a reader instance
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-reader-1 \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-mysql \
  --db-parameter-group-name myapp-aurora-mysql8-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --auto-minor-version-upgrade

# Create a second reader for better availability
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-reader-2 \
  --db-cluster-identifier myapp-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql \
  --db-parameter-group-name myapp-aurora-mysql8-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

Note that reader instances can be different sizes than the writer. You might use smaller instances for readers if your read workload is lighter.

## Step 6: Understanding Aurora Endpoints

Aurora provides multiple endpoints:

```bash
# Get all endpoints for the cluster
aws rds describe-db-clusters \
  --db-cluster-identifier myapp-aurora-cluster \
  --query 'DBClusters[0].{
    ClusterEndpoint:Endpoint,
    ReaderEndpoint:ReaderEndpoint,
    Port:Port
  }'
```

- **Cluster endpoint** (writer): `myapp-aurora-cluster.cluster-abc123.us-east-1.rds.amazonaws.com` - Always points to the current writer instance. Use this for all writes and reads that need the latest data.

- **Reader endpoint**: `myapp-aurora-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com` - Load-balances across all reader instances. Use this for read-only queries that can tolerate slight replication lag.

- **Instance endpoints**: Each instance also has its own direct endpoint. Useful for connecting to a specific instance for troubleshooting.

## Connecting Your Application

Configure your application with separate write and read connections:

```python
import mysql.connector
from mysql.connector import pooling

# Connection pool for writes (cluster endpoint)
write_pool = pooling.MySQLConnectionPool(
    pool_name="write_pool",
    pool_size=10,
    host="myapp-aurora-cluster.cluster-abc123.us-east-1.rds.amazonaws.com",
    port=3306,
    user="admin",
    password="your_password",
    database="myapp",
    ssl_ca="/path/to/global-bundle.pem"
)

# Connection pool for reads (reader endpoint)
read_pool = pooling.MySQLConnectionPool(
    pool_name="read_pool",
    pool_size=20,
    host="myapp-aurora-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com",
    port=3306,
    user="admin",
    password="your_password",
    database="myapp",
    ssl_ca="/path/to/global-bundle.pem"
)

def execute_write(query, params=None):
    """Execute a write query against the cluster endpoint."""
    conn = write_pool.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def execute_read(query, params=None):
    """Execute a read query against the reader endpoint."""
    conn = read_pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        conn.close()
```

## Configuring Failover Priority

Control which reader gets promoted to writer during a failover:

```bash
# Set failover priority (tier 0 is highest priority, 15 is lowest)
aws rds modify-db-instance \
  --db-instance-identifier myapp-aurora-reader-1 \
  --promotion-tier 0

aws rds modify-db-instance \
  --db-instance-identifier myapp-aurora-reader-2 \
  --promotion-tier 1
```

Tier 0 readers get promoted first. If you have a larger reader instance, set it as the highest priority.

## Testing Failover

Test that failover works before you need it in a real incident:

```bash
# Trigger a manual failover
aws rds failover-db-cluster \
  --db-cluster-identifier myapp-aurora-cluster \
  --target-db-instance-identifier myapp-aurora-reader-1
```

Monitor the failover:

```bash
# Watch events during failover
aws rds describe-events \
  --source-identifier myapp-aurora-cluster \
  --source-type db-cluster \
  --duration 30
```

A typical Aurora failover completes in 15-30 seconds.

## Setting Up Monitoring

Set up [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view) for your Aurora cluster. Aurora has additional metrics beyond standard RDS:

```bash
# Alert on Aurora-specific metrics
# Deadlocks per second
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-myapp-deadlocks" \
  --metric-name Deadlocks \
  --namespace AWS/RDS \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBClusterIdentifier,Value=myapp-aurora-cluster \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts

# Aurora replica lag
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-myapp-replica-lag" \
  --metric-name AuroraReplicaLag \
  --namespace AWS/RDS \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBClusterIdentifier,Value=myapp-aurora-cluster \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts
```

For a deeper understanding of how Aurora handles storage and replication under the hood, check out our post on [Aurora architecture and storage](https://oneuptime.com/blog/post/understand-aurora-architecture-and-storage/view). And if you need to add more read capacity later, see our guide on [setting up Aurora read replicas](https://oneuptime.com/blog/post/set-up-aurora-read-replicas/view).

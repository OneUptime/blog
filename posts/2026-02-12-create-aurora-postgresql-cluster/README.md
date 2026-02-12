# How to Create an Aurora PostgreSQL Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Aurora, PostgreSQL, Database, High Availability

Description: Complete guide to setting up an Amazon Aurora PostgreSQL cluster with writer and reader instances, custom parameters, and production-ready configuration.

---

Aurora PostgreSQL combines PostgreSQL compatibility with AWS's cloud-native distributed storage engine. You get the familiar PostgreSQL syntax, extensions, and ecosystem while gaining automatic storage scaling, faster replication, and quicker failover than standard RDS PostgreSQL.

If you're building a new application on PostgreSQL or looking to upgrade from standard RDS, Aurora PostgreSQL is a strong choice for production workloads. Let's set up a complete cluster with everything you need for a production deployment.

## What Makes Aurora PostgreSQL Different

Compared to standard RDS PostgreSQL:

- **Storage layer**: Shared distributed storage that automatically scales from 10 GB to 128 TB. No need to provision storage upfront.
- **Replication**: Physical replication at the storage layer. Reader instances share the same storage volume as the writer, so replica lag is typically under 10 milliseconds.
- **Failover**: Automated failover in under 30 seconds. With Aurora, the reader instances are already connected to the storage, so failover is just a matter of promoting one.
- **Performance**: AWS claims up to 3x throughput compared to standard PostgreSQL for some workloads. Real-world results vary, but it is genuinely faster for many use cases.

## Step 1: Create Network Resources

Start with the subnet group:

```bash
# Create a DB subnet group spanning multiple AZs
aws rds create-db-subnet-group \
  --db-subnet-group-name myapp-aurora-pg-subnets \
  --db-subnet-group-description "Subnets for Aurora PostgreSQL" \
  --subnet-ids subnet-abc123 subnet-def456 subnet-ghi789
```

Create a security group:

```bash
# Create a security group for the Aurora cluster
aws ec2 create-security-group \
  --group-name myapp-aurora-pg-sg \
  --description "Security group for Aurora PostgreSQL cluster" \
  --vpc-id vpc-abc123

# Allow PostgreSQL access from your application servers
aws ec2 authorize-security-group-ingress \
  --group-id sg-newgroupid \
  --protocol tcp \
  --port 5432 \
  --source-group sg-app-servers
```

## Step 2: Create Parameter Groups

Aurora PostgreSQL uses both cluster and instance parameter groups:

```bash
# Create a cluster parameter group
aws rds create-db-cluster-parameter-group \
  --db-cluster-parameter-group-name myapp-aurora-pg16-cluster \
  --db-parameter-group-family aurora-postgresql16 \
  --description "Aurora PostgreSQL 16 cluster parameters"

# Configure cluster parameters
aws rds modify-db-cluster-parameter-group \
  --db-cluster-parameter-group-name myapp-aurora-pg16-cluster \
  --parameters \
    "ParameterName=rds.force_ssl,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot" \
    "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate" \
    "ParameterName=log_statement,ParameterValue=ddl,ApplyMethod=immediate"

# Create an instance parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name myapp-aurora-pg16-instance \
  --db-parameter-group-family aurora-postgresql16 \
  --description "Aurora PostgreSQL 16 instance parameters"
```

## Step 3: Create the Aurora Cluster

```bash
# Create the Aurora PostgreSQL cluster
aws rds create-db-cluster \
  --db-cluster-identifier myapp-aurora-pg-cluster \
  --engine aurora-postgresql \
  --engine-version 16.2 \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --database-name myapp_production \
  --db-subnet-group-name myapp-aurora-pg-subnets \
  --vpc-security-group-ids sg-newgroupid \
  --db-cluster-parameter-group-name myapp-aurora-pg16-cluster \
  --storage-encrypted \
  --backup-retention-period 14 \
  --preferred-backup-window "02:00-03:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --deletion-protection \
  --enable-iam-database-authentication
```

Wait for the cluster to be available:

```bash
# Check cluster status
aws rds describe-db-clusters \
  --db-cluster-identifier myapp-aurora-pg-cluster \
  --query 'DBClusters[0].Status'
```

## Step 4: Create Writer and Reader Instances

```bash
# Create the writer instance
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-pg-writer \
  --db-cluster-identifier myapp-aurora-pg-cluster \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-postgresql \
  --db-parameter-group-name myapp-aurora-pg16-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --promotion-tier 0

# Wait for the writer
aws rds wait db-instance-available \
  --db-instance-identifier myapp-aurora-pg-writer

# Create the first reader
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-pg-reader-1 \
  --db-cluster-identifier myapp-aurora-pg-cluster \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-postgresql \
  --db-parameter-group-name myapp-aurora-pg16-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --promotion-tier 1

# Create a second reader in a different AZ
aws rds create-db-instance \
  --db-instance-identifier myapp-aurora-pg-reader-2 \
  --db-cluster-identifier myapp-aurora-pg-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql \
  --db-parameter-group-name myapp-aurora-pg16-instance \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --promotion-tier 2
```

## Step 5: Get Your Endpoints

```bash
# Get cluster endpoints
aws rds describe-db-clusters \
  --db-cluster-identifier myapp-aurora-pg-cluster \
  --query 'DBClusters[0].{Writer:Endpoint,Reader:ReaderEndpoint,Port:Port}'
```

You'll get three types of endpoints:

- **Cluster (writer) endpoint**: Routes to the current writer instance. Use for all writes and consistency-critical reads.
- **Reader endpoint**: Load-balances across reader instances. Use for read-only queries.
- **Instance endpoints**: Direct connection to specific instances. Use for debugging or targeted queries.

## Step 6: Initial Database Setup

Connect to the cluster and set up your database:

```bash
# Connect to the writer endpoint
psql -h myapp-aurora-pg-cluster.cluster-abc123.us-east-1.rds.amazonaws.com \
  -U admin -d myapp_production
```

```sql
-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application users
CREATE USER app_user WITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE myapp_production TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Create a read-only user for the reader endpoint
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE myapp_production TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly_user;
```

## Connecting from Your Application

Here's a Python example using separate connection pools for reads and writes:

```python
import psycopg2
from psycopg2 import pool

# Writer connection pool
write_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host='myapp-aurora-pg-cluster.cluster-abc123.us-east-1.rds.amazonaws.com',
    port=5432,
    dbname='myapp_production',
    user='app_user',
    password='app_password',
    sslmode='require',
    sslrootcert='/path/to/global-bundle.pem'
)

# Reader connection pool
read_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=40,
    host='myapp-aurora-pg-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com',
    port=5432,
    dbname='myapp_production',
    user='readonly_user',
    password='readonly_password',
    sslmode='require',
    sslrootcert='/path/to/global-bundle.pem'
)

def write_query(sql, params=None):
    """Execute a write query against the writer endpoint."""
    conn = write_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            if cur.description:
                return cur.fetchall()
    finally:
        write_pool.putconn(conn)

def read_query(sql, params=None):
    """Execute a read query against the reader endpoint."""
    conn = read_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        read_pool.putconn(conn)
```

## Setting Up Monitoring

```bash
# CPU alarm for the writer
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-pg-writer-cpu-high" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=myapp-aurora-pg-writer \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts

# Aurora-specific: replica lag alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-pg-replica-lag" \
  --metric-name AuroraReplicaLag \
  --namespace AWS/RDS \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBClusterIdentifier,Value=myapp-aurora-pg-cluster \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts

# Buffer cache hit ratio (Aurora-specific)
aws cloudwatch put-metric-alarm \
  --alarm-name "aurora-pg-cache-hit-low" \
  --metric-name BufferCacheHitRatio \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 95 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=myapp-aurora-pg-writer \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts
```

## Testing Failover

Always test failover before you need it:

```bash
# Trigger a manual failover
aws rds failover-db-cluster \
  --db-cluster-identifier myapp-aurora-pg-cluster

# Monitor the failover
aws rds describe-events \
  --source-identifier myapp-aurora-pg-cluster \
  --source-type db-cluster \
  --duration 15
```

During failover, the cluster endpoint automatically redirects to the new writer. Your application just needs to handle brief connection errors and retry.

For more on Aurora internals, see our guide on [understanding Aurora architecture and storage](https://oneuptime.com/blog/post/understand-aurora-architecture-and-storage/view). And for scaling reads, check out [setting up Aurora read replicas](https://oneuptime.com/blog/post/set-up-aurora-read-replicas/view).

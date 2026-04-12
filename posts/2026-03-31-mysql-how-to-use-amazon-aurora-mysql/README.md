# How to Use Amazon Aurora MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Amazon Aurora, AWS, Cloud Database, High Availability

Description: Learn how to create and configure an Amazon Aurora MySQL cluster, including reader endpoints, Auto Scaling, and performance optimization techniques.

---

## What Is Amazon Aurora MySQL

Amazon Aurora MySQL is a MySQL-compatible relational database that offers up to 5x the throughput of standard MySQL on the same hardware. Aurora separates storage from compute - storage automatically scales up to 128 TB in 10 GB increments, and data is replicated six ways across three Availability Zones.

## Aurora MySQL vs. Standard RDS MySQL

| Feature | RDS MySQL | Aurora MySQL |
|---------|-----------|--------------|
| Storage scaling | Manual | Automatic (up to 128 TB) |
| Read replicas | Up to 5 | Up to 15 |
| Failover time | 60-120 seconds | Under 30 seconds |
| Replication lag | Can be minutes | Typically under 10ms |
| Cost | Lower | Higher (~20% more) |

## Create an Aurora MySQL Cluster

```bash
# Create a DB cluster
aws rds create-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.0 \
  --master-username admin \
  --master-user-password "S3cur3P@ssw0rd" \
  --db-subnet-group-name my-aurora-subnet-group \
  --vpc-security-group-ids sg-0abc12345 \
  --backup-retention-period 7 \
  --storage-encrypted \
  --region us-east-1

# Add a writer instance
aws rds create-db-instance \
  --db-instance-identifier my-aurora-instance-1 \
  --db-cluster-identifier my-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql
```

## Add a Read Replica

```bash
aws rds create-db-instance \
  --db-instance-identifier my-aurora-instance-2 \
  --db-cluster-identifier my-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql
```

## Connect Using Cluster Endpoints

Aurora provides two key endpoints:

```bash
# Writer endpoint - always points to the primary
WRITER=$(aws rds describe-db-clusters \
  --db-cluster-identifier my-aurora-cluster \
  --query "DBClusters[0].Endpoint" --output text)

# Reader endpoint - load balances across read replicas
READER=$(aws rds describe-db-clusters \
  --db-cluster-identifier my-aurora-cluster \
  --query "DBClusters[0].ReaderEndpoint" --output text)

# Connect to writer
mysql -h $WRITER -u admin -p --ssl-mode=REQUIRED

# Connect to reader (read-only queries)
mysql -h $READER -u admin -p --ssl-mode=REQUIRED
```

## Enable Aurora Auto Scaling for Read Replicas

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace rds \
  --resource-id cluster:my-aurora-cluster \
  --scalable-dimension rds:cluster:ReadReplicaCount \
  --min-capacity 1 \
  --max-capacity 5

aws application-autoscaling put-scaling-policy \
  --service-namespace rds \
  --resource-id cluster:my-aurora-cluster \
  --scalable-dimension rds:cluster:ReadReplicaCount \
  --policy-name aurora-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "RDSReaderAverageCPUUtilization"
    }
  }'
```

## Enable Aurora Serverless v2

For variable workloads, Aurora Serverless v2 scales compute capacity automatically:

```bash
aws rds create-db-cluster \
  --db-cluster-identifier my-serverless-aurora \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.0 \
  --master-username admin \
  --master-user-password "S3cur3P@ssw0rd" \
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=16

# Add a Serverless v2 instance to the cluster
aws rds create-db-instance \
  --db-instance-identifier my-serverless-instance \
  --db-cluster-identifier my-serverless-aurora \
  --db-instance-class db.serverless \
  --engine aurora-mysql
```

## Enable Performance Insights and Slow Query Log

```bash
aws rds modify-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --cloudwatch-logs-export-configuration EnableLogTypes=slowquery,error,general

aws rds modify-db-instance \
  --db-instance-identifier my-aurora-instance-1 \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately
```

## Aurora Global Database for Multi-Region

```bash
aws rds create-global-cluster \
  --global-cluster-identifier my-global-aurora \
  --source-db-cluster-identifier arn:aws:rds:us-east-1:123456789012:cluster:my-aurora-cluster
```

## Summary

Amazon Aurora MySQL offers significant performance improvements over standard RDS MySQL with automatic storage scaling, fast failover, and up to 15 read replicas. For production workloads requiring high availability and read scalability, Aurora MySQL with Auto Scaling and Global Database provides a robust, managed MySQL-compatible platform.

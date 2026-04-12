# How to Use Amazon RDS for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Amazon RDS, AWS, Cloud Database, Infrastructure

Description: Learn how to create, configure, and connect to an Amazon RDS MySQL instance, including parameter groups, security groups, and monitoring setup.

---

## What Is Amazon RDS for MySQL

Amazon RDS for MySQL is a managed relational database service that automates provisioning, patching, backups, and failover for MySQL. It supports MySQL versions 5.7 (extended support), 8.0, and 8.4 LTS, with options for single-AZ and Multi-AZ deployments.

## Create an RDS MySQL Instance via AWS CLI

```bash
# Create a DB subnet group first
aws rds create-db-subnet-group \
  --db-subnet-group-name my-mysql-subnet-group \
  --db-subnet-group-description "MySQL subnet group" \
  --subnet-ids subnet-abc12345 subnet-def67890

# Create the RDS instance
aws rds create-db-instance \
  --db-instance-identifier my-mysql-db \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --master-user-password "S3cur3P@ssw0rd" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --db-subnet-group-name my-mysql-subnet-group \
  --vpc-security-group-ids sg-0abc12345 \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted \
  --no-publicly-accessible \
  --region us-east-1
```

## Create a Custom Parameter Group

Parameter groups let you fine-tune MySQL settings without modifying `my.cnf` directly:

```bash
# Create the parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name my-mysql8-params \
  --db-parameter-group-family mysql8.0 \
  --description "Custom MySQL 8.0 parameters"

# Tune key parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-mysql8-params \
  --parameters \
    "ParameterName=innodb_buffer_pool_size,ParameterValue={DBInstanceClassMemory*3/4},ApplyMethod=pending-reboot" \
    "ParameterName=slow_query_log,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=long_query_time,ParameterValue=2,ApplyMethod=immediate" \
    "ParameterName=max_connections,ParameterValue=300,ApplyMethod=pending-reboot"
```

## Connect to the RDS Instance

```bash
# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier my-mysql-db \
  --query "DBInstances[0].Endpoint.Address" \
  --output text

# Connect with mysql client
mysql -h my-mysql-db.c1234567890.us-east-1.rds.amazonaws.com \
  -u admin -p --ssl-mode=REQUIRED
```

## Create a Read Replica

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier my-mysql-db-replica \
  --source-db-instance-identifier my-mysql-db \
  --db-instance-class db.t3.medium \
  --region us-east-1
```

## Enable Enhanced Monitoring

```bash
aws rds modify-db-instance \
  --db-instance-identifier my-mysql-db \
  --monitoring-interval 60 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-monitoring-role \
  --apply-immediately
```

## Enable Performance Insights

```bash
aws rds modify-db-instance \
  --db-instance-identifier my-mysql-db \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately
```

## Set Up Automated Snapshots

RDS automatically takes daily snapshots when `backup-retention-period` is greater than 0. You can also take manual snapshots:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier my-mysql-db \
  --db-snapshot-identifier my-mysql-db-snapshot-20260101
```

## Using Terraform to Provision RDS

```hcl
resource "aws_db_instance" "mysql" {
  identifier           = "my-mysql-db"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_type         = "gp3"
  storage_encrypted    = true
  username             = "admin"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.mysql.name
  vpc_security_group_ids = [aws_security_group.mysql.id]
  backup_retention_period = 7
  multi_az             = true
  skip_final_snapshot  = false
  final_snapshot_identifier = "my-mysql-db-final"
}
```

## Summary

Amazon RDS for MySQL simplifies database operations by managing backups, patching, and Multi-AZ failover automatically. Using parameter groups, enhanced monitoring, and Performance Insights gives you deep visibility and control over MySQL performance without managing the underlying infrastructure.

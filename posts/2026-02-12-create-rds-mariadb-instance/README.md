# How to Create an RDS MariaDB Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, MariaDB, Database

Description: Learn how to create an Amazon RDS MariaDB instance with step-by-step instructions covering configuration, networking, and production best practices.

---

MariaDB is a community-developed fork of MySQL that's gained significant traction for its performance improvements, additional storage engines, and commitment to staying open source. On RDS, it's fully managed just like MySQL, but with some MariaDB-specific features that make it worth considering. Let's walk through setting one up.

## Why MariaDB Over MySQL on RDS?

Before we dive in, here's why you might choose MariaDB:

- **Thread pool**: MariaDB includes a thread pool that handles high-concurrency workloads better than MySQL's thread-per-connection model.
- **Aria storage engine**: A crash-safe alternative to MyISAM for temporary tables, which can improve query performance.
- **Optimizer improvements**: MariaDB's query optimizer has diverged from MySQL's and often performs better on complex queries.
- **System versioning**: Built-in temporal tables that track historical changes to your data.
- **Fully open source**: No Oracle-controlled enterprise features behind a paywall.

That said, if your application was built specifically for MySQL 8.x features, stick with MySQL. The two have diverged enough that they're not 100% drop-in replacements anymore.

## Creating via the Console

### Engine and Version

In the RDS console, click "Create database," choose Standard create, and select **MariaDB**. Choose the latest 10.11.x or 11.x version. MariaDB's LTS versions (like 10.11) are good choices for production.

### Template and Instance Class

The templates are the same as other engines:

- **Free tier**: db.t3.micro, 20 GB storage
- **Dev/Test**: Flexible, single-AZ
- **Production**: Multi-AZ, optimized defaults

For instance sizing, MariaDB's thread pool means it handles more connections per vCPU than MySQL. You might be able to use a slightly smaller instance class for the same workload.

### Settings

Configure identifiers and credentials:

- **DB instance identifier**: Something like `my-app-mariadb`
- **Master username**: Default is `admin`
- **Master password**: Use a strong password or opt for Secrets Manager

### Storage

MariaDB storage configuration is identical to MySQL. Use gp3 for most workloads.

- **Dev/test**: 20-50 GB, gp3 with default IOPS
- **Production**: Size based on data, gp3 with adjusted IOPS if needed
- Enable storage autoscaling

### Connectivity and Security

Set up networking as you would for any RDS instance:

- VPC and subnet group
- No public access for production
- Security group allowing port 3306

This security group rule allows MariaDB connections from your application.

```
Type: MySQL/Aurora (MariaDB uses the same port)
Protocol: TCP
Port: 3306
Source: sg-your-app-security-group
```

### Additional Configuration

- **Initial database name**: Set this to create a database during launch
- **Parameter group**: Default works to start. MariaDB has some unique parameters you might want to tune, like `thread_pool_size` and `thread_pool_max_threads`.
- **Backup retention**: 7 days for production
- **Log exports**: Enable audit log, error log, general log, and slow query log as needed

## Creating via CLI

This command creates a production MariaDB instance with Multi-AZ and encryption.

```bash
aws rds create-db-instance \
  --db-instance-identifier my-app-mariadb \
  --db-instance-class db.r6g.large \
  --engine mariadb \
  --engine-version 10.11.6 \
  --master-username admin \
  --master-user-password 'YourStrongPassword123!' \
  --allocated-storage 100 \
  --storage-type gp3 \
  --iops 6000 \
  --storage-throughput 250 \
  --multi-az \
  --db-name myappdb \
  --vpc-security-group-ids sg-0abc123def456789 \
  --db-subnet-group-name my-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["audit", "error", "slowquery"]' \
  --monitoring-interval 60 \
  --monitoring-role-arn arn:aws:iam::123456789:role/rds-monitoring-role \
  --deletion-protection \
  --tags Key=Environment,Value=production Key=Engine,Value=mariadb
```

## Connecting to Your Instance

MariaDB uses the same protocol and port as MySQL, so any MySQL client works.

```bash
# Connect with the mariadb client
mariadb -h my-app-mariadb.abc123.us-east-1.rds.amazonaws.com \
  -u admin -p \
  --port 3306

# Or use the mysql client - it works too
mysql -h my-app-mariadb.abc123.us-east-1.rds.amazonaws.com \
  -u admin -p \
  --port 3306
```

## Post-Creation Setup

Create application users and configure the database properly.

This script creates an application user and a read-only user with appropriate privileges.

```sql
-- Create the application database (if not created during launch)
CREATE DATABASE IF NOT EXISTS myappdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create an application user
CREATE USER 'myapp'@'%' IDENTIFIED BY 'app_strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
  ON myappdb.* TO 'myapp'@'%';

-- Create a read-only user for analytics
CREATE USER 'analytics'@'%' IDENTIFIED BY 'analytics_strong_password';
GRANT SELECT ON myappdb.* TO 'analytics'@'%';

-- Apply the privilege changes
FLUSH PRIVILEGES;
```

## MariaDB-Specific Features on RDS

### Thread Pool Tuning

MariaDB's thread pool is enabled by default on RDS. You can tune it through parameter groups.

These parameter group settings optimize the thread pool for high-concurrency workloads.

```
thread_handling = pool-of-threads
thread_pool_size = [number of vCPUs]
thread_pool_max_threads = 1000
thread_pool_idle_timeout = 60
```

### Audit Plugin

MariaDB on RDS supports the server audit plugin for compliance logging.

This enables audit logging through a custom parameter group.

```bash
# Create a custom parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name mariadb-audit \
  --db-parameter-group-family mariadb10.11 \
  --description "MariaDB with audit logging"

# Enable the audit plugin
aws rds modify-db-parameter-group \
  --db-parameter-group-name mariadb-audit \
  --parameters "ParameterName=server_audit_logging,ParameterValue=1,ApplyMethod=immediate" \
               "ParameterName=server_audit_events,ParameterValue=CONNECT,QUERY_DDL,ApplyMethod=immediate"
```

### System Versioned Tables

MariaDB supports system versioning (temporal tables), which automatically tracks historical versions of rows.

This creates a table that automatically maintains a history of all changes.

```sql
-- Create a system-versioned table
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  price DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) WITH SYSTEM VERSIONING;

-- Query historical data
SELECT * FROM products FOR SYSTEM_TIME AS OF '2024-01-01 00:00:00';

-- Query all versions of a row
SELECT * FROM products FOR SYSTEM_TIME ALL WHERE id = 42;
```

This is incredibly useful for audit trails and debugging - you can see the state of any row at any point in time without building your own change tracking.

## Migrating from MySQL to MariaDB

If you're considering moving from RDS MySQL to RDS MariaDB, here's what to know:

1. **Schema compatibility**: MariaDB 10.x is largely compatible with MySQL 5.7. The gap widens with MySQL 8.0+ features.
2. **Use mysqldump**: Export from MySQL and import into MariaDB using `mysqldump`. This handles most compatibility differences.
3. **Test thoroughly**: Run your full test suite against MariaDB. Pay attention to query plans - they may differ.
4. **Application changes**: Most MySQL client libraries work with MariaDB without changes. Update connection strings to point to the new instance.

## Monitoring

Monitor these MariaDB-specific metrics alongside the standard RDS metrics:

- **Threads_running**: Active threads executing queries
- **Threadpool_threads**: Total threads in the pool
- **Innodb_buffer_pool_hit_rate**: Should be above 99%
- **Slow_queries**: Count of queries exceeding `long_query_time`

Set up comprehensive monitoring with [CloudWatch alerting](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to catch issues early.

## Cost Comparison

MariaDB on RDS is typically the same price as MySQL on RDS for the same instance class and storage configuration, since both are open-source engines. There's no licensing premium like there is with SQL Server or Oracle. This makes MariaDB an excellent choice if you want advanced features without extra cost.

## Wrapping Up

Creating an RDS MariaDB instance follows the same general process as MySQL, but you get access to MariaDB-specific features like the thread pool, system versioning, and the Aria storage engine. If you're starting a new project and don't have a strong preference between MySQL and MariaDB, it's worth giving MariaDB a serious look - especially for workloads with high concurrency or where you'd benefit from built-in temporal tables.

# How to Create an RDS PostgreSQL Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, PostgreSQL, Database

Description: Step-by-step guide to creating an Amazon RDS PostgreSQL instance using the AWS Console and CLI with best practices for production deployments.

---

PostgreSQL is one of the most popular database engines on RDS, and for good reason. It's feature-rich, supports advanced data types like JSONB, has excellent extension support, and it's fully open source. In this guide, we'll create an RDS PostgreSQL instance both through the console and with the AWS CLI.

## Console Walkthrough

The console workflow for PostgreSQL is similar to MySQL but with some PostgreSQL-specific options. Let's go through it.

### Choose Engine and Version

In the RDS console, click "Create database," select **Standard create**, then choose **PostgreSQL** as the engine. For the version, go with the latest PostgreSQL 16.x unless you have compatibility constraints. AWS defaults to a well-tested version, so the default is usually a safe bet.

### Templates and Instance Configuration

Pick the template that fits your use case:

- **Free tier**: db.t3.micro with 20 GB - great for trying things out
- **Dev/Test**: Flexible sizing, single-AZ
- **Production**: Multi-AZ, optimized defaults

For the instance class, PostgreSQL tends to benefit from more memory than MySQL for the same workload because of how it handles shared buffers and caching. A db.r6g.large (16 GB RAM) is a solid starting point for production.

### Settings

Set your DB instance identifier, master username (default is `postgres`), and password. Like MySQL, you can opt into AWS Secrets Manager for password management, which is strongly recommended for production.

### Storage Configuration

PostgreSQL workloads often benefit from gp3 storage, which lets you independently scale IOPS and throughput.

Here's a reasonable starting configuration for different environments.

```
Environment  | Storage | Type | IOPS  | Throughput
-------------|---------|------|-------|----------
Dev/Test     | 20 GB   | gp3  | 3,000 | 125 MiB/s
Staging      | 100 GB  | gp3  | 6,000 | 250 MiB/s
Production   | 500 GB  | gp3  | 12,000| 500 MiB/s
```

Enable storage autoscaling and set a sensible maximum. For production, a maximum of 2x your initial allocation is a good starting point.

### Connectivity

The networking setup is the same as any RDS instance:

- Put it in the VPC where your applications run
- Use a DB subnet group spanning at least two availability zones
- Set public access to **No**
- Attach a security group that allows inbound on port 5432 from your application

This inbound rule allows PostgreSQL connections from your application's security group.

```
Type: PostgreSQL
Protocol: TCP
Port: 5432
Source: sg-your-app-security-group
```

### PostgreSQL-Specific Settings

Under "Additional configuration," there are a few PostgreSQL-specific things to configure:

- **Initial database name**: Set this to your application's database name. Unlike MySQL, if you leave this blank, RDS won't create a database and you'll connect to the default `postgres` database.
- **DB parameter group**: The default parameter group works for most cases. Key parameters you might want to tune later include `shared_buffers`, `work_mem`, and `max_connections`. See our guide on [configuring RDS parameter groups](https://oneuptime.com/blog/post/2026-02-12-configure-rds-parameter-groups/view) for details.
- **Log exports**: Enable `postgresql` log export to CloudWatch. The PostgreSQL log captures slow queries, errors, and connection events.

## Creating via the AWS CLI

The CLI approach is better for automation and reproducibility. Here's the full command.

This creates a production-ready PostgreSQL instance with Multi-AZ and encryption enabled.

```bash
aws rds create-db-instance \
  --db-instance-identifier my-app-postgres \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 16.4 \
  --master-username postgres \
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
  --kms-key-id alias/aws/rds \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --monitoring-interval 60 \
  --monitoring-role-arn arn:aws:iam::123456789:role/rds-monitoring-role \
  --deletion-protection \
  --tags Key=Environment,Value=production Key=Team,Value=backend
```

Let's break down the less obvious flags:

- `--storage-encrypted`: Enables encryption at rest using KMS. There's no performance penalty, and it's a security best practice.
- `--monitoring-interval 60`: Enables Enhanced Monitoring with 60-second granularity. Requires a monitoring IAM role.
- `--enable-cloudwatch-logs-exports`: Sends PostgreSQL logs to CloudWatch for easy searching and alerting.

## Connecting to Your Instance

Once the instance status is "Available," get the endpoint.

```bash
# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier my-app-postgres \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Connect using psql.

```bash
# Connect with psql
psql -h my-app-postgres.abc123.us-east-1.rds.amazonaws.com \
  -U postgres \
  -d myappdb \
  -p 5432
```

## Post-Creation Setup

After your instance is running, set up proper users and permissions.

This script creates an application user, a read-only user, and sets up schema permissions.

```sql
-- Create a role for the application
CREATE ROLE myapp_role;
GRANT CONNECT ON DATABASE myappdb TO myapp_role;
GRANT USAGE ON SCHEMA public TO myapp_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myapp_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO myapp_role;

-- Create the application user
CREATE USER myapp_user WITH PASSWORD 'app_strong_password';
GRANT myapp_role TO myapp_user;

-- Create a read-only user for reporting
CREATE ROLE readonly_role;
GRANT CONNECT ON DATABASE myappdb TO readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly_role;

CREATE USER reporting_user WITH PASSWORD 'reporting_strong_password';
GRANT readonly_role TO reporting_user;
```

## Installing Extensions

One of PostgreSQL's biggest strengths is its extension ecosystem. On RDS, many popular extensions are available.

Check which extensions are available and install the ones you need.

```sql
-- See available extensions
SELECT * FROM pg_available_extensions ORDER BY name;

-- Install commonly used extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance stats
CREATE EXTENSION IF NOT EXISTS "postgis";      -- Geospatial data (if available)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram text search
```

The `pg_stat_statements` extension is particularly valuable. It tracks execution statistics for all SQL statements, helping you find slow queries and optimization opportunities.

## Monitoring

Set up CloudWatch alarms for these key metrics:

- **CPUUtilization**: Alert above 80%
- **FreeableMemory**: Alert below 256 MB
- **FreeStorageSpace**: Alert below 10 GB or 10% of total
- **DatabaseConnections**: Alert at 80% of max_connections
- **ReadLatency / WriteLatency**: Alert above 20ms

For a more comprehensive monitoring setup, check out [monitoring AWS infrastructure with OneUptime](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## PostgreSQL vs Aurora PostgreSQL

If you need even better performance, consider Aurora PostgreSQL. It offers:

- Up to 5x throughput over standard PostgreSQL on RDS
- Storage that auto-scales up to 128 TB
- Up to 15 read replicas with sub-10ms replica lag
- Automatic failover in under 30 seconds

The trade-off is cost - Aurora is more expensive, especially for small workloads. Standard RDS PostgreSQL is perfect for most applications, and you can migrate to Aurora later if needed.

## Wrapping Up

Creating an RDS PostgreSQL instance is straightforward whether you use the console or CLI. The important decisions are choosing the right instance size for your workload, configuring networking and security correctly, and enabling backups and monitoring from day one. PostgreSQL's extension support, JSONB capabilities, and strong community make it an excellent choice for most applications running on AWS.

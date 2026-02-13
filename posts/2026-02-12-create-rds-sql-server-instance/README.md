# How to Create an RDS SQL Server Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, SQL Server, Database

Description: Learn how to create an Amazon RDS SQL Server instance with the right edition, licensing, and configuration for your workload.

---

Running SQL Server on RDS is a popular choice for teams migrating .NET applications to AWS or those who need SQL Server-specific features like T-SQL, SSRS, or SSIS. AWS handles the licensing, patching, and backups, so you can focus on your application. Let's walk through creating an RDS SQL Server instance and the decisions you'll need to make.

## SQL Server Editions on RDS

AWS offers four editions of SQL Server on RDS:

- **SQL Server Express**: Free edition with a 10 GB database size limit. Good for small apps and testing.
- **SQL Server Web**: Licensed for public-facing web workloads only. Cheaper than Standard.
- **SQL Server Standard**: Full-featured edition for most production workloads.
- **SQL Server Enterprise**: All features including Always On availability groups and advanced security. Most expensive.

The edition you choose affects pricing significantly. Express is included in the instance cost. Web is roughly 50% cheaper than Standard. Enterprise can be 4-5x the cost of Standard.

## Licensing Options

RDS SQL Server supports two licensing models:

- **License Included**: AWS includes the SQL Server license in the hourly instance cost. This is the default and simplest option.
- **Bring Your Own License (BYOL)**: Use your existing SQL Server licenses. This requires Software Assurance and involves license mobility through Microsoft.

For most teams, License Included is the way to go. BYOL only makes sense if you have existing Enterprise licenses with Software Assurance that would otherwise go unused.

## Creating the Instance - Console

### Engine Selection

In the RDS console, click "Create database," choose Standard create, and select **Microsoft SQL Server**. Then pick your edition and version. SQL Server 2022 is the latest supported version.

### Instance Configuration

SQL Server on RDS has some specific constraints:

- Minimum instance size varies by edition (Express can use db.t3.micro, Enterprise needs at least db.r5.large)
- Multi-AZ uses SQL Server Database Mirroring or Always On (depending on edition)
- Storage sizes have minimums: 20 GB for Express/Web/Standard, 200 GB for Enterprise

Pick your instance class based on workload.

```
Edition     | Min Instance    | Typical Production
------------|-----------------|-------------------
Express     | db.t3.micro     | db.t3.medium
Web         | db.t3.small     | db.m6i.large
Standard    | db.t3.small     | db.r6i.xlarge
Enterprise  | db.r5.large     | db.r6i.2xlarge
```

### Settings

Set up identifiers and credentials:

- **DB instance identifier**: Something like `my-app-sqlserver`
- **Master username**: Default is `admin`. Note that SQL Server on RDS doesn't let you use `sa` as the master username.
- **Master password**: Choose something strong

### Storage

SQL Server workloads often have high I/O demands, especially for OLTP. Consider gp3 for most workloads and io1 for heavy transactional systems.

One important note: SQL Server on RDS uses a single EBS volume for both data and log files. You can't separate them onto different volumes like you might on a self-managed instance. This makes choosing the right IOPS configuration especially important.

### Connectivity

Standard RDS networking applies here. SQL Server uses port 1433 by default.

This security group rule allows SQL Server connections from your application tier.

```
Type: MSSQL
Protocol: TCP
Port: 1433
Source: sg-your-app-security-group
```

### Windows Authentication

If you need Windows Authentication, you can integrate RDS SQL Server with AWS Managed Microsoft AD. This is configured in the "Microsoft SQL Server Windows authentication" section during creation. You'll need an existing Managed AD directory.

## Creating via CLI

This command creates a SQL Server Standard instance with all the essential options.

```bash
aws rds create-db-instance \
  --db-instance-identifier my-app-sqlserver \
  --db-instance-class db.r6i.large \
  --engine sqlserver-se \
  --engine-version 16.00.4135.4.v1 \
  --license-model license-included \
  --master-username admin \
  --master-user-password 'YourStrongPassword123!' \
  --allocated-storage 200 \
  --storage-type gp3 \
  --iops 6000 \
  --storage-throughput 250 \
  --multi-az \
  --vpc-security-group-ids sg-0abc123def456789 \
  --db-subnet-group-name my-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["error", "agent"]' \
  --deletion-protection \
  --tags Key=Environment,Value=production
```

The engine identifiers for SQL Server editions are:

- `sqlserver-ex` - Express
- `sqlserver-web` - Web
- `sqlserver-se` - Standard
- `sqlserver-ee` - Enterprise

## Connecting to Your Instance

Use SQL Server Management Studio (SSMS), Azure Data Studio, or the `sqlcmd` command-line tool.

This command connects to the RDS SQL Server instance using sqlcmd.

```bash
# Connect with sqlcmd
sqlcmd -S my-app-sqlserver.abc123.us-east-1.rds.amazonaws.com,1433 \
  -U admin \
  -P 'YourStrongPassword123!'
```

From your application, a typical connection string looks like this.

```
Server=my-app-sqlserver.abc123.us-east-1.rds.amazonaws.com,1433;
Database=MyAppDB;
User Id=admin;
Password=YourStrongPassword123!;
Encrypt=True;
TrustServerCertificate=True;
```

## Creating Databases

Unlike MySQL and PostgreSQL, you don't specify an initial database during instance creation. Create databases after connecting.

This T-SQL creates a database and an application login with appropriate permissions.

```sql
-- Create the application database
CREATE DATABASE MyAppDB;
GO

-- Create a login for the application
CREATE LOGIN myapp_login WITH PASSWORD = 'AppStrongPassword123!';
GO

-- Switch to the application database
USE MyAppDB;
GO

-- Create a user mapped to the login
CREATE USER myapp_user FOR LOGIN myapp_login;
GO

-- Grant appropriate permissions
ALTER ROLE db_datareader ADD MEMBER myapp_user;
ALTER ROLE db_datawriter ADD MEMBER myapp_user;
GO
```

## SQL Server-Specific RDS Features

### Native Backup and Restore

RDS SQL Server supports native backup and restore to/from S3. This is incredibly useful for migrating databases to RDS.

This enables native backup/restore by adding the S3 integration option group.

```bash
# Create an option group with native backup/restore
aws rds create-option-group \
  --option-group-name sqlserver-backup-restore \
  --engine-name sqlserver-se \
  --major-engine-version 16.00 \
  --option-group-description "SQL Server with native backup/restore"

# Add the backup/restore option
aws rds add-option-to-option-group \
  --option-group-name sqlserver-backup-restore \
  --options "OptionName=SQLSERVER_BACKUP_RESTORE,OptionSettings=[{Name=IAM_ROLE_ARN,Value=arn:aws:iam::123456789:role/rds-sqlserver-backup-role}]"
```

### Transparent Data Encryption (TDE)

Enterprise edition supports TDE for encrypting data files at the database level. This is on top of the EBS-level encryption that all RDS instances support.

### SQL Server Agent

RDS includes SQL Server Agent for scheduling jobs. You can use it for maintenance tasks, ETL processes, and scheduled scripts.

## Performance Considerations

SQL Server on RDS has some performance characteristics to be aware of:

1. **Memory**: SQL Server is memory-hungry. Choose an instance class with enough RAM for your working set. The r-class instances (memory-optimized) are usually the best fit.
2. **tempdb**: RDS manages tempdb automatically. It's placed on local instance storage for better performance on some instance types.
3. **Max worker threads**: This is managed by RDS based on your instance size. You don't need to configure it manually.
4. **MAXDOP**: Set this in your parameter group. A good starting value is the number of vCPUs divided by 2, with a maximum of 8.

## Monitoring

Set up alerts for these key metrics. For a comprehensive monitoring approach, you might want to check out [AWS CloudWatch alerting](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view).

Key metrics to watch:

- **CPUUtilization**: SQL Server can be CPU-intensive for complex queries
- **FreeableMemory**: SQL Server will use as much memory as available
- **WriteIOPS/ReadIOPS**: Monitor I/O to make sure you're not hitting limits
- **DatabaseConnections**: SQL Server has connection limits based on edition

## Wrapping Up

Creating an RDS SQL Server instance involves a few more decisions than MySQL or PostgreSQL, mainly around edition selection and licensing. The key is matching the edition to your needs - don't pay for Enterprise features if Standard covers your requirements. Once running, SQL Server on RDS gives you all the familiar T-SQL capabilities with the convenience of managed backups, patching, and high availability. If you're migrating from on-premises, the native backup/restore feature makes the transition much smoother.

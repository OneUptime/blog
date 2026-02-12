# How to Create an RDS Oracle Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Oracle, Database

Description: A complete guide to creating an Amazon RDS Oracle instance, covering edition selection, licensing models, and Oracle-specific configuration options.

---

Oracle Database on RDS is the go-to choice when your applications depend on Oracle-specific features like PL/SQL packages, Advanced Queuing, or Oracle Spatial. AWS manages the infrastructure while you get a fully compatible Oracle environment. The setup involves more licensing and edition decisions than open-source engines, so let's walk through everything.

## Oracle Editions on RDS

RDS supports two Oracle editions:

- **Oracle Standard Edition Two (SE2)**: Includes most features needed for typical business applications. Licensed per socket or per Named User Plus (NUP).
- **Oracle Enterprise Edition (EE)**: The full-featured edition with partitioning, Advanced Compression, Real Application Testing, and other premium features.

The edition choice has massive cost implications. Enterprise can be 5-10x more expensive than Standard Edition Two for the same instance size.

## Licensing Models

This is where Oracle on RDS gets complicated:

- **License Included**: AWS bundles the Oracle license into the per-hour instance cost. Available for SE2. Simplest approach - no license tracking needed.
- **Bring Your Own License (BYOL)**: Use your existing Oracle licenses. Available for both SE2 and EE. Requires an active Oracle support contract.

Enterprise Edition is ONLY available through BYOL. If you don't have existing Oracle licenses, you're limited to SE2 with License Included pricing.

For BYOL, you need to ensure compliance with Oracle's licensing terms. On RDS, Oracle licenses are based on vCPUs:

- Each vCPU requires 0.5 processor licenses
- A db.r6i.xlarge with 4 vCPUs needs 2 processor licenses

## Creating via the Console

### Engine Selection

In the RDS console, select **Oracle** as the engine. Choose your edition (SE2 or EE) and version. Oracle 19c is the most commonly used long-term support release.

### Instance Configuration

Oracle is memory-intensive. Choose r-class instances for production workloads.

Here are typical instance recommendations by workload size.

```
Workload      | Instance Class   | vCPUs | Memory
--------------|------------------|-------|-------
Dev/Test      | db.m6i.large     | 2     | 8 GB
Small Prod    | db.r6i.large     | 2     | 16 GB
Medium Prod   | db.r6i.xlarge    | 4     | 32 GB
Large Prod    | db.r6i.2xlarge   | 8     | 64 GB
```

### Settings

- **DB instance identifier**: e.g., `my-app-oracle`
- **Master username**: Default is `admin`. Oracle doesn't allow `SYS` or `SYSTEM` as the master user on RDS.
- **Master password**: Strong password required

### Storage

Oracle workloads are often I/O heavy, especially with OLTP systems.

- **gp3**: Good for most workloads. Adjust IOPS and throughput independently.
- **io1/io2**: For mission-critical OLTP with consistent low-latency requirements.

Minimum storage for Oracle on RDS is 20 GB, but production systems typically need 100 GB or more.

### Connectivity

Standard RDS networking. Oracle uses port 1521 by default.

This security group rule allows Oracle connections from your application.

```
Type: Oracle-RDS
Protocol: TCP
Port: 1521
Source: sg-your-app-security-group
```

### Oracle-Specific Options

Under Additional configuration:

- **DB name**: This is the Oracle SID. Keep it short (e.g., ORCL, MYAPP). It must start with a letter and be 1-8 characters.
- **Character set**: Choose carefully - this can't be changed later. `AL32UTF8` is recommended for Unicode support.
- **National character set**: `AL16UTF16` is the default and works for most cases.

## Creating via CLI

This command creates an Oracle SE2 instance with License Included pricing.

```bash
aws rds create-db-instance \
  --db-instance-identifier my-app-oracle \
  --db-instance-class db.r6i.large \
  --engine oracle-se2 \
  --engine-version 19.0.0.0.ru-2024-04.rur-2024-04.r1 \
  --license-model license-included \
  --master-username admin \
  --master-user-password 'YourStrongPassword123!' \
  --allocated-storage 200 \
  --storage-type gp3 \
  --iops 6000 \
  --storage-throughput 250 \
  --multi-az \
  --db-name MYAPP \
  --vpc-security-group-ids sg-0abc123def456789 \
  --db-subnet-group-name my-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["alert", "audit", "listener", "trace"]' \
  --deletion-protection \
  --tags Key=Environment,Value=production
```

For Enterprise Edition with BYOL, change the engine and license model.

```bash
--engine oracle-ee \
--license-model bring-your-own-license
```

## Connecting to Your Instance

Use SQL*Plus, Oracle SQL Developer, or any Oracle client.

This connects to the Oracle instance using SQL*Plus.

```bash
# Connect with SQL*Plus
sqlplus admin/'YourStrongPassword123!'@'(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=my-app-oracle.abc123.us-east-1.rds.amazonaws.com)(PORT=1521))(CONNECT_DATA=(SID=MYAPP)))'
```

Or with a simpler EZ Connect syntax.

```bash
sqlplus admin/'YourStrongPassword123!'@my-app-oracle.abc123.us-east-1.rds.amazonaws.com:1521/MYAPP
```

## Post-Creation Setup

Create application schemas and users following Oracle best practices.

This script creates an application tablespace and schema user with appropriate privileges.

```sql
-- Create a tablespace for the application
-- Note: On RDS, you use the rdsadmin procedures for some operations
BEGIN
  rdsadmin.rdsadmin_util.create_directory('DATA_PUMP_DIR');
END;
/

-- Create an application schema user
CREATE USER myapp_user IDENTIFIED BY "app_strong_password"
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;

-- Grant basic privileges
GRANT CREATE SESSION TO myapp_user;
GRANT CREATE TABLE TO myapp_user;
GRANT CREATE SEQUENCE TO myapp_user;
GRANT CREATE PROCEDURE TO myapp_user;
GRANT CREATE VIEW TO myapp_user;
GRANT CREATE TRIGGER TO myapp_user;

-- Grant specific object permissions as needed
-- Avoid granting DBA role to application users
```

## Oracle Option Groups on RDS

Oracle on RDS uses option groups to enable features that aren't on by default. Common options include:

- **STATSPACK**: Performance monitoring and tuning
- **APEX**: Oracle Application Express for web application development
- **OEM_AGENT**: Oracle Enterprise Manager agent
- **NATIVE_NETWORK_ENCRYPTION**: Encrypt data in transit
- **TDE**: Transparent Data Encryption (Enterprise only)

This creates an option group and adds native network encryption.

```bash
# Create an option group
aws rds create-option-group \
  --option-group-name oracle-with-encryption \
  --engine-name oracle-se2 \
  --major-engine-version 19 \
  --option-group-description "Oracle SE2 with native encryption"

# Add native network encryption
aws rds add-option-to-option-group \
  --option-group-name oracle-with-encryption \
  --options "OptionName=NATIVE_NETWORK_ENCRYPTION,OptionSettings=[{Name=SQLNET.ENCRYPTION_SERVER,Value=REQUIRED},{Name=SQLNET.ENCRYPTION_TYPES_SERVER,Value=AES256}]"
```

For more details on option groups, see [configuring RDS option groups](https://oneuptime.com/blog/post/configure-rds-option-groups/view).

## Performance Tuning

Oracle on RDS benefits from proper tuning. Key parameters to adjust through parameter groups:

- **sga_target**: Set to about 75% of instance memory for dedicated database servers
- **pga_aggregate_target**: Set to about 15-20% of instance memory
- **open_cursors**: Increase from the default if your application uses many prepared statements
- **processes**: Maximum number of operating system processes (connections + background processes)

Learn more about tuning in our guide on [configuring RDS parameter groups](https://oneuptime.com/blog/post/configure-rds-parameter-groups/view).

## Monitoring Oracle on RDS

Oracle has rich internal monitoring views. Combine them with CloudWatch metrics.

This query shows the top SQL statements by elapsed time.

```sql
-- Top SQL by elapsed time
SELECT sql_id, elapsed_time/1000000 as elapsed_seconds,
       executions, sql_text
FROM v$sql
WHERE elapsed_time > 1000000
ORDER BY elapsed_time DESC
FETCH FIRST 10 ROWS ONLY;

-- Check tablespace usage
SELECT tablespace_name,
       ROUND(used_space * 8192 / 1024 / 1024) AS used_mb,
       ROUND(tablespace_size * 8192 / 1024 / 1024) AS total_mb,
       ROUND(used_percent, 2) AS used_pct
FROM dba_tablespace_usage_metrics;
```

For external monitoring, consider setting up [infrastructure monitoring with OneUptime](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) to keep an eye on both CloudWatch metrics and application-level health checks.

## Cost Considerations

Oracle on RDS is the most expensive engine option. A db.r6i.large with License Included SE2 in us-east-1 costs roughly $0.70/hour - about $500/month before storage and I/O costs. Enterprise BYOL instances are cheaper per hour (since you supply the license), but you still need to account for your Oracle license costs.

Some cost-saving strategies:

1. **Reserved Instances**: 1-year or 3-year commitments save 30-60%
2. **Right-size**: Oracle on smaller instances can still perform well with proper tuning
3. **Consider alternatives**: For new projects, PostgreSQL covers many Oracle use cases at a fraction of the cost

## Wrapping Up

Creating an RDS Oracle instance involves more decisions than open-source engines, particularly around edition and licensing. The key is matching your Oracle license situation with the right RDS configuration. If you have existing licenses, BYOL gives you the most flexibility. If you're starting fresh, SE2 with License Included is the simplest path. Once the licensing is sorted, the actual instance creation follows the same pattern as any other RDS engine - choose your size, configure networking, set up backups, and you're running.

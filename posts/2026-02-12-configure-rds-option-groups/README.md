# How to Configure RDS Option Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Database, Configuration

Description: Learn how to configure RDS option groups to enable engine-specific features like native backup/restore, audit logging, and transparent data encryption.

---

If parameter groups control how your database engine behaves, option groups control which additional features are enabled. Options are engine-specific plugins or features that aren't part of the base database installation. Think of them as add-ons: native backup/restore for SQL Server, the audit plugin for MySQL, or Application Express for Oracle. Not all engines use option groups extensively, but for SQL Server and Oracle, they're essential.

## What Are Option Groups?

An option group is a container for engine-specific options that you can attach to an RDS instance. Each RDS instance has exactly one option group. Like parameter groups, there's a default option group that's read-only. To add options, you create a custom option group.

Options can include:
- Additional database plugins and features
- Network-level configurations like encryption
- Integration features like backup to S3
- Security features like TDE and auditing

## Which Engines Use Option Groups?

Not all engines make equal use of option groups:

- **Oracle**: Heavy use - TDE, APEX, STATSPACK, OEM Agent, native network encryption
- **SQL Server**: Heavy use - native backup/restore, TDE, SSRS, SSIS, SSAS
- **MySQL**: Moderate use - MariaDB Audit Plugin, memcached plugin
- **MariaDB**: Moderate use - MariaDB Audit Plugin
- **PostgreSQL**: Minimal use - most PostgreSQL features are handled through extensions and parameters

## Creating an Option Group

Start by creating a custom option group for your engine.

This creates an option group for SQL Server Standard Edition.

```bash
aws rds create-option-group \
  --option-group-name sqlserver-production-options \
  --engine-name sqlserver-se \
  --major-engine-version 16.00 \
  --option-group-description "Production options for SQL Server SE"
```

For Oracle:

```bash
aws rds create-option-group \
  --option-group-name oracle-production-options \
  --engine-name oracle-se2 \
  --major-engine-version 19 \
  --option-group-description "Production options for Oracle SE2"
```

For MySQL:

```bash
aws rds create-option-group \
  --option-group-name mysql-production-options \
  --engine-name mysql \
  --major-engine-version 8.0 \
  --option-group-description "Production options for MySQL 8.0"
```

## SQL Server: Native Backup and Restore

The most commonly used SQL Server option. It lets you backup databases to S3 and restore from S3 backups, which is essential for migration and custom backup strategies.

### Setup

First, create an IAM role that allows RDS to access your S3 bucket.

This creates the IAM role for SQL Server native backup/restore.

```bash
# Create the role
aws iam create-role \
  --role-name rds-sqlserver-backup-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "rds.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 permissions
aws iam put-role-policy \
  --role-name rds-sqlserver-backup-role \
  --policy-name s3-backup-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::my-rds-backups",
        "arn:aws:s3:::my-rds-backups/*"
      ]
    }]
  }'
```

Add the option to the option group.

```bash
aws rds add-option-to-option-group \
  --option-group-name sqlserver-production-options \
  --options "OptionName=SQLSERVER_BACKUP_RESTORE,OptionSettings=[{Name=IAM_ROLE_ARN,Value=arn:aws:iam::123456789012:role/rds-sqlserver-backup-role}]"
```

### Using Native Backup/Restore

Once enabled, you can backup and restore databases using T-SQL.

This T-SQL creates a backup of a database to S3.

```sql
-- Backup a database to S3
exec msdb.dbo.rds_backup_database
  @source_db_name='MyAppDB',
  @s3_arn_to_backup_to='arn:aws:s3:::my-rds-backups/MyAppDB_backup.bak',
  @overwrite_s3_backup_file=1;

-- Check backup status
exec msdb.dbo.rds_task_status @db_name='MyAppDB';

-- Restore a database from S3
exec msdb.dbo.rds_restore_database
  @restore_db_name='MyAppDB_Restored',
  @s3_arn_to_restore_from='arn:aws:s3:::my-rds-backups/MyAppDB_backup.bak';
```

## Oracle: Common Options

### Oracle APEX

Oracle Application Express lets you build web applications inside the database.

```bash
aws rds add-option-to-option-group \
  --option-group-name oracle-production-options \
  --options "OptionName=APEX,OptionVersion=23.1.v1"

# Also add APEX-DEV for development tools
aws rds add-option-to-option-group \
  --option-group-name oracle-production-options \
  --options "OptionName=APEX-DEV"
```

### Oracle Native Network Encryption

Encrypts data in transit between the application and database without requiring SSL certificates.

```bash
aws rds add-option-to-option-group \
  --option-group-name oracle-production-options \
  --options "OptionName=NATIVE_NETWORK_ENCRYPTION,OptionSettings=[
    {Name=SQLNET.ENCRYPTION_SERVER,Value=REQUIRED},
    {Name=SQLNET.ENCRYPTION_TYPES_SERVER,Value=AES256},
    {Name=SQLNET.CRYPTO_CHECKSUM_SERVER,Value=REQUIRED},
    {Name=SQLNET.CRYPTO_CHECKSUM_TYPES_SERVER,Value=SHA256}
  ]"
```

### Oracle STATSPACK

Performance monitoring for Oracle. It's the free alternative to AWR reports (which require Enterprise Edition Diagnostics Pack).

```bash
aws rds add-option-to-option-group \
  --option-group-name oracle-production-options \
  --options "OptionName=STATSPACK"
```

After adding STATSPACK, create snapshots and generate reports from SQL*Plus.

```sql
-- Take a STATSPACK snapshot
EXECUTE STATSPACK.SNAP;

-- Generate a report between two snapshots
@$ORACLE_HOME/rdbms/admin/spreport.sql
```

### Oracle TDE (Enterprise Edition Only)

Transparent Data Encryption encrypts data at the tablespace level.

```bash
aws rds add-option-to-option-group \
  --option-group-name oracle-ee-options \
  --options "OptionName=TDE"
```

## MySQL: Audit Plugin

The MariaDB Audit Plugin works with MySQL on RDS for compliance logging.

```bash
# Create option group for MySQL
aws rds create-option-group \
  --option-group-name mysql-audit-options \
  --engine-name mysql \
  --major-engine-version 8.0 \
  --option-group-description "MySQL with audit logging"

# Add the audit plugin
aws rds add-option-to-option-group \
  --option-group-name mysql-audit-options \
  --options "OptionName=MARIADB_AUDIT_PLUGIN,OptionSettings=[
    {Name=SERVER_AUDIT_EVENTS,Value=CONNECT,QUERY_DDL,QUERY_DML},
    {Name=SERVER_AUDIT_EXCL_USERS,Value=rdsadmin}
  ]"
```

The audit plugin logs connection events and queries, which is essential for compliance requirements like PCI DSS, HIPAA, and SOX.

## Applying an Option Group

Attach the option group to your RDS instance.

```bash
aws rds modify-db-instance \
  --db-instance-identifier my-db \
  --option-group-name sqlserver-production-options \
  --apply-immediately
```

Some options require a reboot, while others take effect immediately. Check the option documentation for your specific options.

## Listing Available Options

See what options are available for your engine.

This lists all available options for SQL Server Standard Edition.

```bash
aws rds describe-option-group-options \
  --engine-name sqlserver-se \
  --major-engine-version 16.00 \
  --query 'OptionGroupOptions[*].{Name:Name,Description:Description,Persistent:Persistent,Permanent:Permanent}' \
  --output table
```

## Removing Options

Some options can be removed, but others are persistent (can't be removed once added) or permanent (option group can't be disassociated from the instance).

This removes a non-persistent option.

```bash
aws rds remove-option-from-option-group \
  --option-group-name sqlserver-production-options \
  --options SQLSERVER_BACKUP_RESTORE \
  --apply-immediately
```

Check the `Persistent` and `Permanent` flags before adding options - you might not be able to remove them later.

## Terraform Example

This Terraform configuration creates an option group with SQL Server native backup/restore.

```hcl
resource "aws_db_option_group" "sqlserver" {
  name                     = "sqlserver-production-options"
  engine_name              = "sqlserver-se"
  major_engine_version     = "16.00"
  option_group_description = "Production options for SQL Server SE"

  option {
    option_name = "SQLSERVER_BACKUP_RESTORE"

    option_settings {
      name  = "IAM_ROLE_ARN"
      value = aws_iam_role.rds_backup.arn
    }
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_db_instance" "sqlserver" {
  # ... other config ...
  option_group_name = aws_db_option_group.sqlserver.name
}
```

## Best Practices

1. **Create custom option groups**: Like parameter groups, never rely on the default.
2. **Check persistence before adding**: Some options can't be removed. Know this before you add them.
3. **Test in non-production first**: Some options require reboots or can affect performance.
4. **Version compatibility**: Option groups are tied to major engine versions. When upgrading, you'll need a new option group for the new version.
5. **Document your options**: Keep track of why each option was added and who requested it.

For monitoring the impact of option changes, consider setting up [infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) to track performance before and after.

## Wrapping Up

Option groups aren't as frequently touched as parameter groups, but they enable important functionality that you can't get any other way on RDS. SQL Server's native backup/restore and Oracle's APEX and encryption options are features many teams depend on daily. The key is understanding which options are available for your engine, whether they're persistent, and planning for the reboot that some options require. Create your custom option group, add what you need, and associate it with your instance.

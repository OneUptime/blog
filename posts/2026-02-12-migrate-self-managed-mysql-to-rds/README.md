# How to Migrate from Self-Managed MySQL to RDS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, MySQL, Migration, Database

Description: A practical guide to migrating your self-managed MySQL database to Amazon RDS with minimal downtime using mysqldump, native replication, and AWS DMS.

---

Running your own MySQL server means you're responsible for patching, backups, replication, failover, monitoring, and all the other operational overhead that comes with it. Migrating to RDS hands all of that off to AWS so your team can focus on the application instead of the database infrastructure.

The migration itself can range from trivially simple (for small databases) to carefully orchestrated (for large, high-traffic production systems). Let's look at the different approaches and when to use each one.

## Choosing a Migration Approach

There are three main strategies, each with different trade-offs:

| Approach | Best For | Downtime | Complexity |
|---|---|---|---|
| mysqldump | Small databases (< 10 GB) | Minutes to hours | Low |
| Native replication | Medium to large databases | Seconds (cutover only) | Medium |
| AWS DMS | Any size, especially heterogeneous | Seconds (cutover only) | Medium |

For most production migrations, you'll want either native replication or DMS because they support continuous replication, allowing you to keep the source and target in sync until you're ready to cut over.

## Pre-Migration Checklist

Before starting, gather this information:

```bash
# Check MySQL version on your source
mysql -e "SELECT VERSION();"

# Check database sizes
mysql -e "SELECT table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS 'Size (GB)'
  FROM information_schema.tables
  GROUP BY table_schema;"

# Check character set and collation
mysql -e "SELECT default_character_set_name, default_collation_name
  FROM information_schema.SCHEMATA
  WHERE schema_name = 'your_database';"

# List any MySQL plugins in use
mysql -e "SHOW PLUGINS;"
```

Make sure:
- RDS supports your MySQL version (or a compatible one)
- You've identified any MySQL features you use that RDS doesn't support (e.g., custom plugins, MyISAM tables for some use cases)
- Your VPC and security groups are configured to allow traffic between the source and RDS
- You have enough storage allocated on the target RDS instance

## Method 1: mysqldump (Simple, Small Databases)

For databases under 10 GB where some downtime is acceptable, mysqldump is the simplest option.

Create the RDS instance first:

```bash
# Create the target RDS MySQL instance
aws rds create-db-instance \
  --db-instance-identifier my-mysql-rds \
  --db-instance-class db.r6g.large \
  --engine mysql \
  --engine-version 8.0.36 \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name my-subnet-group \
  --multi-az \
  --max-allocated-storage 500
```

Once the instance is available, dump and restore:

```bash
# Dump the database from the source server
# --single-transaction ensures a consistent snapshot without locking tables
# --routines includes stored procedures and functions
# --triggers includes triggers
mysqldump \
  --host=source-mysql-server.example.com \
  --user=admin \
  --password \
  --single-transaction \
  --routines \
  --triggers \
  --databases myapp_production \
  > /tmp/myapp_dump.sql

# Import into RDS
mysql \
  --host=my-mysql-rds.abc123.us-east-1.rds.amazonaws.com \
  --user=admin \
  --password \
  < /tmp/myapp_dump.sql
```

For larger dumps, compress the output:

```bash
# Compressed dump and restore in a single pipeline
mysqldump \
  --host=source-mysql-server.example.com \
  --user=admin \
  --password \
  --single-transaction \
  --routines \
  --triggers \
  --databases myapp_production \
  | gzip | mysql \
  --host=my-mysql-rds.abc123.us-east-1.rds.amazonaws.com \
  --user=admin \
  --password
```

## Method 2: Native MySQL Replication (Near-Zero Downtime)

For larger databases or when you can't afford extended downtime, set up the RDS instance as a replica of your source MySQL server. This keeps both databases in sync until you're ready to switch.

### Step 1: Enable Binary Logging on Source

Your source MySQL server needs binary logging enabled. In your MySQL config:

```ini
# Add to my.cnf on the source server
[mysqld]
log-bin = mysql-bin
binlog-format = ROW
server-id = 1
binlog-retention-hours = 168  # Keep 7 days of binlogs
```

Restart MySQL after making this change.

### Step 2: Create a Replication User

```sql
-- Create a user for RDS to connect with for replication
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'strong_password_here';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'repl_user'@'%';
FLUSH PRIVILEGES;
```

### Step 3: Take a Consistent Backup and Note the Binlog Position

```bash
# Take a dump with binlog coordinates recorded
mysqldump \
  --host=source-mysql-server.example.com \
  --user=admin \
  --password \
  --single-transaction \
  --master-data=2 \
  --routines \
  --triggers \
  --databases myapp_production \
  > /tmp/myapp_repl_dump.sql

# The file header will contain a line like:
# -- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000042', MASTER_LOG_POS=12345;
```

### Step 4: Restore to RDS

```bash
# Load the dump into the RDS instance
mysql \
  --host=my-mysql-rds.abc123.us-east-1.rds.amazonaws.com \
  --user=admin \
  --password \
  < /tmp/myapp_repl_dump.sql
```

### Step 5: Configure Replication on RDS

RDS provides stored procedures for managing replication:

```sql
-- Configure the RDS instance to replicate from your source server
CALL mysql.rds_set_external_master(
  'source-mysql-server.example.com',  -- host
  3306,                                 -- port
  'repl_user',                          -- replication user
  'strong_password_here',               -- password
  'mysql-bin.000042',                   -- binlog file from the dump
  12345,                                -- binlog position from the dump
  0                                     -- ssl disabled (use 1 for SSL)
);

-- Start replication
CALL mysql.rds_start_replication;
```

### Step 6: Monitor Replication

```sql
-- Check replication status
SHOW SLAVE STATUS\G

-- Key fields to watch:
-- Slave_IO_Running: Yes
-- Slave_SQL_Running: Yes
-- Seconds_Behind_Master: 0 (or close to it)
```

Wait until `Seconds_Behind_Master` reaches 0 and stays there. Your RDS instance is now caught up with the source.

### Step 7: Cut Over

When you're ready to switch:

1. Stop writes to the source database (put the application in maintenance mode)
2. Wait for replication lag to reach 0
3. Stop replication on RDS:

```sql
-- Stop replication and disconnect from the source
CALL mysql.rds_stop_replication;
CALL mysql.rds_reset_external_master;
```

4. Update your application's connection string to point to the RDS endpoint
5. Bring the application back online

The actual downtime is just the time between stopping writes and restarting the application - usually a few seconds to a minute.

## Method 3: AWS Database Migration Service

For a more managed approach, especially when you need schema transformations or monitoring during migration, [AWS DMS](https://oneuptime.com/blog/post/use-dms-to-migrate-databases-to-rds/view) is an excellent option. It handles the initial data load and ongoing replication through a managed service.

## Post-Migration Tasks

After the migration, don't forget these steps:

```bash
# Verify row counts match between source and target
# Run on source
mysql -h source -e "SELECT COUNT(*) FROM myapp_production.users;"
# Run on target
mysql -h my-mysql-rds.abc123.us-east-1.rds.amazonaws.com -e "SELECT COUNT(*) FROM myapp_production.users;"

# Enable automated backups (if not already configured)
aws rds modify-db-instance \
  --db-instance-identifier my-mysql-rds \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# Enable Performance Insights for monitoring
aws rds modify-db-instance \
  --db-instance-identifier my-mysql-rds \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

Also set up [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view) and [event notifications](https://oneuptime.com/blog/post/enable-rds-event-notifications-via-sns/view) so you're alerted to any issues with the new RDS instance.

## Common Migration Issues

**Character set mismatches**: If your source uses a different default character set than RDS, you might see encoding issues. Check and match character sets before migrating.

**Stored procedures with DEFINER clauses**: MySQL stored procedures have a DEFINER that specifies which user created them. If that user doesn't exist on RDS, the procedures won't execute. Fix the DEFINERs in your dump file or recreate the procedures.

**Missing features**: RDS MySQL doesn't support some features like the SUPER privilege, file-based operations (LOAD DATA LOCAL), or custom plugins. Test your application thoroughly against RDS before going live.

Migrating to RDS is one of those investments that pays for itself quickly. The operational burden of running your own MySQL server is significant, and handing that off lets your team focus on work that actually moves the business forward.

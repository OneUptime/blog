# How to Upgrade RDS Engine Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Upgrades, Database, Operations

Description: A comprehensive guide to upgrading Amazon RDS database engine versions including minor and major version upgrades with testing strategies and rollback plans.

---

Database engine upgrades are one of those tasks that nobody looks forward to but everyone needs to do. Old versions lose support, miss out on performance improvements, and accumulate security vulnerabilities. AWS publishes end-of-life dates for RDS engine versions, and when that date arrives, AWS will force an upgrade whether you're ready or not.

Better to do it on your own terms with proper testing and a rollback plan. Let's walk through the process for both minor and major version upgrades.

## Minor vs. Major Version Upgrades

The distinction matters because they have very different risk profiles:

**Minor version upgrades** (e.g., PostgreSQL 16.1 to 16.2, MySQL 8.0.35 to 8.0.36):
- Bug fixes and security patches
- Backward compatible
- Low risk
- Can be automated via auto minor version upgrade
- Brief downtime (restart required)

**Major version upgrades** (e.g., PostgreSQL 15 to 16, MySQL 5.7 to 8.0):
- New features, behavioral changes, deprecations
- May break compatibility with existing queries or applications
- Higher risk - requires thorough testing
- Must be done manually
- Longer downtime

## Checking Available Versions

See what versions you can upgrade to:

```bash
# Check available upgrade targets for your current version
aws rds describe-db-engine-versions \
  --engine postgres \
  --engine-version 15.4 \
  --query 'DBEngineVersions[0].ValidUpgradeTarget[*].{Version:EngineVersion,IsMajor:IsMajorVersionUpgrade}' \
  --output table

# Check what version your instance is currently running
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{Engine:Engine,Version:EngineVersion,Class:DBInstanceClass}'
```

## Minor Version Upgrades

### Automatic Minor Version Upgrades

The easiest approach is to let AWS handle minor upgrades automatically during your maintenance window:

```bash
# Enable auto minor version upgrade
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --auto-minor-version-upgrade \
  --apply-immediately
```

AWS applies the upgrade during your [maintenance window](https://oneuptime.com/blog/post/set-up-rds-maintenance-windows/view). The instance restarts, causing brief downtime (seconds for Multi-AZ, minutes for Single-AZ).

### Manual Minor Version Upgrade

If you prefer to control the timing:

```bash
# Upgrade to a specific minor version
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --engine-version 16.3 \
  --apply-immediately
```

Or schedule it for the next maintenance window by omitting `--apply-immediately`.

## Major Version Upgrades

Major upgrades require more preparation. Here's a systematic approach.

### Step 1: Check Compatibility

Before upgrading, check for compatibility issues.

For PostgreSQL:

```sql
-- Check for deprecated features or syntax
-- Review the PostgreSQL release notes for breaking changes

-- Check extension compatibility
SELECT extname, extversion FROM pg_extension;

-- Check for data type changes
-- pg_upgrade checks these automatically, but review the release notes
```

For MySQL (5.7 to 8.0):

```bash
# Run the upgrade checker utility
mysqlcheck --check-upgrade --all-databases \
  -h my-database.abc123.us-east-1.rds.amazonaws.com \
  -u admin -p
```

```sql
-- Check for tables using deprecated features
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE engine NOT IN ('InnoDB')
  AND table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys');

-- Check for deprecated SQL modes
SHOW VARIABLES LIKE 'sql_mode';
```

### Step 2: Test in a Non-Production Environment

Create a snapshot of your production database and restore it to a test instance:

```bash
# Take a snapshot of production
aws rds create-db-snapshot \
  --db-instance-identifier my-database \
  --db-snapshot-identifier pre-upgrade-snapshot

# Restore to a test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-database-upgrade-test \
  --db-snapshot-identifier pre-upgrade-snapshot \
  --db-instance-class db.r6g.large

# Wait for the test instance to be available
aws rds wait db-instance-available \
  --db-instance-identifier my-database-upgrade-test

# Perform the major version upgrade on the test instance
aws rds modify-db-instance \
  --db-instance-identifier my-database-upgrade-test \
  --engine-version 16.2 \
  --allow-major-version-upgrade \
  --apply-immediately
```

Then run your application test suite against the upgraded test instance. Check:
- All queries execute without errors
- Query performance is comparable or better
- Application functionality works correctly
- Any stored procedures, views, or triggers function properly

### Step 3: Review Parameter Groups

Major version upgrades may require a new parameter group family. For example, upgrading from PostgreSQL 15 to 16 means switching from `postgres15` to `postgres16` family:

```bash
# Create a new parameter group for the target version
aws rds create-db-parameter-group \
  --db-parameter-group-name my-app-postgres16 \
  --db-parameter-group-family postgres16 \
  --description "Parameters for PostgreSQL 16"

# Apply your custom parameters to the new group
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-app-postgres16 \
  --parameters \
    "ParameterName=rds.force_ssl,ParameterValue=1,ApplyMethod=immediate" \
    "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate" \
    "ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot"
```

### Step 4: Take a Pre-Upgrade Snapshot

Always have a rollback point:

```bash
# Create a snapshot right before the upgrade
aws rds create-db-snapshot \
  --db-instance-identifier my-database \
  --db-snapshot-identifier pre-major-upgrade-$(date +%Y%m%d)

# Wait for the snapshot to complete
aws rds wait db-snapshot-available \
  --db-snapshot-identifier pre-major-upgrade-$(date +%Y%m%d)
```

### Step 5: Perform the Upgrade

For standard RDS instances:

```bash
# Perform the major version upgrade
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --engine-version 16.2 \
  --db-parameter-group-name my-app-postgres16 \
  --allow-major-version-upgrade \
  --apply-immediately
```

The `--allow-major-version-upgrade` flag is required for major upgrades as a safety check.

Monitor the upgrade progress:

```bash
# Check the status
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Engine:Engine,Version:EngineVersion}'

# Watch for events during the upgrade
aws rds describe-events \
  --source-identifier my-database \
  --source-type db-instance \
  --duration 120
```

### Step 6: Post-Upgrade Validation

After the upgrade completes:

```bash
# Verify the new version
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].EngineVersion'
```

```sql
-- Check that all extensions are working
SELECT extname, extversion FROM pg_extension;

-- Update statistics for the query planner
ANALYZE;

-- Run key application queries and check execution plans
EXPLAIN ANALYZE SELECT ...;
```

Monitor [Performance Insights](https://oneuptime.com/blog/post/monitor-rds-with-performance-insights/view) closely for the first 24-48 hours to catch any query regressions.

## Using Blue/Green Deployments for Zero-Downtime Upgrades

For production databases where downtime isn't acceptable, RDS [Blue/Green Deployments](https://oneuptime.com/blog/post/rds-blue-green-deployments-zero-downtime-upgrades/view) let you perform major upgrades with minimal disruption. The green environment runs the new version while the blue (current) environment continues serving traffic. When you're satisfied, you switch over.

## Rollback Plan

If something goes wrong after the upgrade, your options depend on the situation:

**For application issues**: If the application has bugs with the new version, fix the application code. Rolling back the database is usually harder than fixing the app.

**For data corruption or critical failures**: Restore from the pre-upgrade snapshot:

```bash
# Restore from the pre-upgrade snapshot to a new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-database-rollback \
  --db-snapshot-identifier pre-major-upgrade-20260212

# Switch your application to point to the rollback instance
```

Note: you'll lose any data written after the snapshot was taken. This is a last resort.

## Upgrade Path Planning

Some major upgrades require intermediate steps. For example, MySQL 5.6 can't jump directly to 8.0 - you need to go through 5.7 first. Check the valid upgrade targets:

```bash
# Check the upgrade path
aws rds describe-db-engine-versions \
  --engine mysql \
  --engine-version 5.7.44 \
  --query 'DBEngineVersions[0].ValidUpgradeTarget[?IsMajorVersionUpgrade==`true`].EngineVersion'
```

Plan your upgrades well before the end-of-life date. Rushing a major version upgrade because support is about to expire is a recipe for problems. Give yourself months, not weeks, to test and prepare.

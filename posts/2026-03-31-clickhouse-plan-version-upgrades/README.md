# How to Plan ClickHouse Version Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Version, Planning, Operation

Description: Learn how to plan ClickHouse version upgrades by reviewing release notes, assessing compatibility, testing in staging, and scheduling production rollouts.

---

ClickHouse releases new versions rapidly - often several times per month. Planning upgrades carefully prevents downtime, data loss, and unexpected behavior changes from catching you off guard.

## Understanding ClickHouse Versioning

ClickHouse uses a `YEAR.RELEASE.PATCH.BUILD` versioning scheme. For example, `24.3.5.46` means the third release of 2024, patch 5, build 46. Long-Term Support (LTS) releases get 1 year of bug fixes; non-LTS stable releases are supported for roughly the 3 most recent stable releases.

## Step 1: Check Current Version

```sql
SELECT version();
```

```bash
clickhouse-server --version
```

## Step 2: Review the Changelog

Always read the full changelog for every version you are skipping:

```bash
# Review recent changes on GitHub
open https://github.com/ClickHouse/ClickHouse/blob/master/CHANGELOG.md
```

Look specifically for:
- **Breaking changes** - behavior or API changes that may affect your queries
- **Deprecated features** - features you use that will be removed
- **New required settings** - settings that changed defaults or became required
- **Format changes** - changes to data format handling

## Step 3: Assess Impact on Your Workloads

Identify features you use that may be affected:

```sql
-- Check which engines you use
SELECT engine, count() AS table_count
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
GROUP BY engine
ORDER BY table_count DESC;

-- Check which functions appear in your query log
SELECT
    extractAll(query, 'toDate|arrayJoin|dictGet|groupArray')[1] AS function_name,
    count()
FROM system.query_log
WHERE event_time >= now() - INTERVAL 7 DAY
  AND type = 'QueryFinish'
GROUP BY function_name
ORDER BY count() DESC;
```

## Step 4: Create an Upgrade Runbook

Document your upgrade procedure before touching any servers:

```text
Upgrade Runbook: ClickHouse 24.3 to 24.8

Pre-upgrade checklist:
[ ] Read changelog for 24.4, 24.5, 24.6, 24.7, 24.8
[ ] Identify breaking changes relevant to our workloads
[ ] Create full backup of all databases
[ ] Back up configuration files
[ ] Test upgrade in staging environment
[ ] Schedule maintenance window (2 hour window minimum)
[ ] Notify affected teams

Upgrade steps:
1. Create backup
2. Stop ClickHouse
3. Install new package
4. Start ClickHouse
5. Run health checks
6. Run smoke test queries
7. Monitor for 30 minutes

Rollback plan:
1. Stop ClickHouse
2. Reinstall previous version
3. Start ClickHouse
4. Verify data integrity
```

## Step 5: Test in Staging First

Never upgrade production without first testing in an environment that mirrors production as closely as possible. See the dedicated post on staging upgrade testing for details.

## Step 6: Schedule the Production Upgrade

Pick a low-traffic window and communicate to stakeholders:

```bash
# Verify current version before upgrade
clickhouse-client --query "SELECT version()"

# Take backup
clickhouse-client --query "BACKUP DATABASE production TO Disk('backups', 'pre_upgrade_backup/')"
```

## Step 7: Post-Upgrade Validation

After upgrading, run validation queries:

```sql
-- Verify version
SELECT version();

-- Check tables are accessible
SELECT database, table, count() FROM system.parts GROUP BY database, table LIMIT 10;

-- Verify replication is healthy
SELECT database, table, is_leader, inserts_in_queue
FROM system.replicas
WHERE inserts_in_queue > 0;
```

## Summary

ClickHouse version upgrade planning requires reading changelogs for every skipped version, assessing impact on your table engines and query patterns, creating a detailed runbook, testing in staging, and scheduling a maintenance window with a clear rollback plan. Never skip straight from an old version to the latest without reviewing intermediate changes.

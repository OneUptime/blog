# How to Create a MySQL Operational Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Runbook, Operation, Documentation, Incident Response

Description: Learn how to create a comprehensive MySQL operational runbook that helps teams respond consistently to database incidents and routine tasks.

---

## Why Every MySQL Deployment Needs a Runbook

A runbook is a living document that captures the operational knowledge needed to manage a system. For MySQL, a good runbook reduces mean time to recovery (MTTR), enables junior engineers to handle incidents, and ensures consistent procedures across the team. Without one, tribal knowledge lives in people's heads and gets lost during rotations.

## Runbook Structure

A MySQL operational runbook should cover these sections:

```text
1. System Overview
2. Connection Details
3. Routine Operations
4. Monitoring and Alerting
5. Incident Response Procedures
6. Backup and Recovery
7. Maintenance Procedures
8. Contact and Escalation
```

## Section 1 - System Overview

Document the environment topology:

```text
Production MySQL Cluster
- Primary: db-primary.prod.example.com (10.0.1.10) - MySQL 8.0.35
- Replica 1: db-replica1.prod.example.com (10.0.1.11)
- Replica 2: db-replica2.prod.example.com (10.0.1.12)
- ProxySQL: proxy.prod.example.com (10.0.1.5)

Replication: GTID-based async replication
Backup: Nightly full backup via XtraBackup at 02:00 UTC
```

## Section 2 - Routine Operations

Include commands for common tasks with exact syntax:

```sql
-- Check replication lag on all replicas
SHOW REPLICA STATUS\G

-- View active connections
SELECT user, host, db, command, time, state
FROM information_schema.PROCESSLIST
WHERE command != 'Sleep'
ORDER BY time DESC;

-- Check table sizes
SELECT table_name,
       ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'myapp'
ORDER BY size_mb DESC
LIMIT 10;
```

## Section 3 - Monitoring Thresholds

Document alert thresholds and expected baselines:

```yaml
alerts:
  connections:
    warning: 70% of max_connections
    critical: 85% of max_connections
    runbook_link: "#high-connection-count"

  replication_lag:
    warning: 30 seconds
    critical: 120 seconds
    runbook_link: "#replication-lag"

  slow_queries:
    warning: 10 per minute
    critical: 50 per minute
    threshold_seconds: 1

  disk_usage:
    warning: 75%
    critical: 85%
```

## Section 4 - Incident Response Procedures

For each alert, document the exact steps:

```text
## High Connection Count

Severity: High
Alert: Threads_connected > 85% of max_connections

Steps:
1. Check current connection count:
   SHOW GLOBAL STATUS LIKE 'Threads_connected';

2. Identify top connection sources:
   SELECT user, host, COUNT(*) FROM information_schema.PROCESSLIST
   GROUP BY user, host ORDER BY COUNT(*) DESC;

3. Kill idle connections older than 5 minutes:
   (Run kill_idle_connections.sql from /opt/mysql-scripts/)

4. If still critical, temporarily increase max_connections:
   SET GLOBAL max_connections = 600;

5. Escalate to DBA team if not resolved in 15 minutes.
```

## Section 5 - Backup and Recovery

Document the full backup and restore workflow with tested commands:

```bash
# Create a manual backup
xtrabackup --backup \
  --target-dir=/backup/manual/$(date +%Y%m%d_%H%M%S) \
  --user=xtrabackup \
  --password=$XTRABACKUP_PASSWORD

# Verify the latest automated backup
ls -lt /backup/mysql/ | head -5
cat /backup/mysql/latest/xtrabackup_checkpoints

# Restore procedure (requires downtime)
# See: /docs/mysql-restore-procedure.md
```

## Section 6 - Contact and Escalation

```text
On-Call Engineer: See PagerDuty rotation
DBA Team Lead: @dba-lead (Slack), +1-555-0100 (PagerDuty P1 only)
Vendor Support: MySQL Enterprise Support - Case portal at support.oracle.com
Escalation SLA: Respond within 5 min (P1), 30 min (P2), 4 hours (P3)
```

## Keeping the Runbook Current

A runbook only has value if it is accurate. Establish a review process:

- Review and update after every incident
- Schedule a quarterly review of all procedures
- Version-control the runbook in Git alongside infrastructure code
- Test runbook procedures in a staging environment at least annually

## Summary

A MySQL operational runbook provides teams with consistent, tested procedures for managing database incidents and routine tasks. An effective runbook covers system topology, monitoring thresholds with alert-specific response steps, backup and recovery procedures, and escalation contacts. Keeping it version-controlled and updated after every incident ensures it remains a reliable reference.

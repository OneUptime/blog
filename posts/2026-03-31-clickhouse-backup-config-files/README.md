# How to Back Up ClickHouse Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Configuration, Operation, Disaster Recovery

Description: Learn how to identify, back up, and restore all ClickHouse configuration files to ensure complete server recovery after failures or migrations.

---

A ClickHouse data backup is incomplete without configuration file backups. Server config files define storage policies, user accounts, quotas, network settings, and more. Losing them means rebuilding your cluster configuration from scratch.

## Key Configuration File Locations

ClickHouse configuration is spread across several directories:

```text
/etc/clickhouse-server/
    config.xml              - Main server configuration
    users.xml               - User accounts and profiles (legacy)
    config.d/               - Configuration override fragments
    users.d/                - User configuration fragments

/var/lib/clickhouse/
    access/                 - SQL-defined users, roles, quotas (RBAC)
    metadata/               - Table and database metadata (DDL)
    store/                  - Data storage (handled by BACKUP command)
```

## Backing Up Configuration Files

Create a comprehensive config backup script:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backup/config/${DATE}"
mkdir -p "$BACKUP_DIR"

# Back up main config directory
cp -r /etc/clickhouse-server/ "$BACKUP_DIR/etc-clickhouse-server/"

# Back up RBAC access control data
cp -r /var/lib/clickhouse/access/ "$BACKUP_DIR/access/"

# Back up metadata (table DDL)
cp -r /var/lib/clickhouse/metadata/ "$BACKUP_DIR/metadata/"

echo "Configuration backup completed: $BACKUP_DIR"
```

## Exporting User and Role Definitions

SQL-defined users and roles live in `/var/lib/clickhouse/access/`. Back them up with:

```bash
# Export all users as SQL
clickhouse-client --query "
SELECT 'CREATE USER ' || name || ' ...'
FROM system.users
WHERE name NOT IN ('default')
FORMAT TSVRaw" > /backup/config/users.sql

# Export roles
clickhouse-client --query "SHOW CREATE ROLE admin FORMAT TSVRaw" > /backup/config/roles.sql
```

## Exporting Storage Policies

Document your storage configuration:

```sql
SELECT
    policy_name,
    volume_name,
    arrayJoin(disks) AS disk_name,
    max_data_part_size,
    move_factor
FROM system.storage_policies
ORDER BY policy_name, volume_name;
```

## Using Version Control for Config Files

Store configuration in Git for change tracking:

```bash
# Initialize Git repo for ClickHouse config
git init /backup/clickhouse-config
cp -r /etc/clickhouse-server/ /backup/clickhouse-config/
cd /backup/clickhouse-config
git add .
git commit -m "ClickHouse config backup $(date +%Y-%m-%d)"
git push origin main
```

This gives you a diff-based history of configuration changes.

## Automating Config Backups with Cron

Schedule regular config backups:

```bash
# Back up configs daily
0 1 * * * /usr/local/bin/clickhouse-config-backup.sh >> /var/log/clickhouse-config-backup.log 2>&1
```

## Restoring Configuration Files

Restore config files to a new server:

```bash
# Restore etc config
cp -r /backup/config/2026-03-31/etc-clickhouse-server/ /etc/clickhouse-server/

# Restore access control (users/roles/quotas)
cp -r /backup/config/2026-03-31/access/ /var/lib/clickhouse/access/

# Fix permissions
chown -R clickhouse:clickhouse /etc/clickhouse-server/
chown -R clickhouse:clickhouse /var/lib/clickhouse/access/

# Restart ClickHouse
systemctl restart clickhouse-server
```

## Summary

ClickHouse configuration backup must cover `/etc/clickhouse-server/` for server settings, `/var/lib/clickhouse/access/` for RBAC data, and `/var/lib/clickhouse/metadata/` for table DDL. Use Git for change tracking, automate daily backups with cron, and store backups offsite alongside data backups for complete disaster recovery.

# How to Back Up ClickHouse Access Control Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Access Control, RBAC, Security

Description: Learn how to back up ClickHouse user accounts, roles, quotas, and row policies to ensure complete recovery of access control configuration.

---

ClickHouse access control data includes user accounts, roles, quotas, settings profiles, and row policies. This data is stored separately from table data and requires its own backup strategy.

## Where Access Control Data Lives

ClickHouse stores SQL-defined access control objects in two places depending on configuration:

- `/var/lib/clickhouse/access/` - binary format files for users, roles, quotas, profiles, and row policies
- `users.xml` / `config.d/*.xml` - legacy XML-based user configuration

## Backing Up the Access Directory

The simplest approach is to copy the access directory:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backup/clickhouse-access/${DATE}"
mkdir -p "$BACKUP_DIR"

# Stop ClickHouse or use a live copy
cp -r /var/lib/clickhouse/access/ "$BACKUP_DIR/access/"

# Back up XML user configs too
cp /etc/clickhouse-server/users.xml "$BACKUP_DIR/" 2>/dev/null || true
cp -r /etc/clickhouse-server/users.d/ "$BACKUP_DIR/users.d/" 2>/dev/null || true

echo "Access control backup completed: $BACKUP_DIR"
```

## Exporting Access Control via SQL

Export users, roles, and policies as SQL statements for portability:

```sql
-- Export user definitions
SELECT name, storage
FROM system.users
WHERE storage = 'local_directory';
```

```bash
# Extract SHOW CREATE for each user
clickhouse-client --query "SELECT name FROM system.users WHERE name NOT IN ('default')" | \
while read user; do
    clickhouse-client --query "SHOW CREATE USER ${user} FORMAT TSVRaw"
done > /backup/users_export.sql
```

## Exporting Roles

```bash
clickhouse-client --query "SELECT name FROM system.roles" | \
while read role; do
    clickhouse-client --query "SHOW CREATE ROLE ${role} FORMAT TSVRaw"
    clickhouse-client --query "SHOW GRANTS FOR ${role} FORMAT TSVRaw"
done > /backup/roles_export.sql
```

## Exporting Quotas and Profiles

```bash
# Quotas
clickhouse-client --query "SELECT name FROM system.quotas" | \
while read quota; do
    clickhouse-client --query "SHOW CREATE QUOTA ${quota} FORMAT TSVRaw"
done > /backup/quotas_export.sql

# Settings profiles
clickhouse-client --query "SELECT name FROM system.settings_profiles WHERE name != 'default'" | \
while read profile; do
    clickhouse-client --query "SHOW CREATE SETTINGS PROFILE ${profile} FORMAT TSVRaw"
done > /backup/profiles_export.sql
```

## Including Access Control in BACKUP DATABASE

When using ClickHouse's native BACKUP command, access control data is not automatically included. Back up configuration files alongside data backups:

```bash
# Data backup
clickhouse-client --query "BACKUP DATABASE production TO Disk('backups', 'prod_${DATE}/')"

# Config and access backup
tar czf "/backup/config_${DATE}.tar.gz" \
    /etc/clickhouse-server/ \
    /var/lib/clickhouse/access/
```

## Restoring Access Control

Restore from file backup:

```bash
# Stop ClickHouse
systemctl stop clickhouse-server

# Restore access files
cp -r /backup/clickhouse-access/2026-03-31/access/ /var/lib/clickhouse/access/
chown -R clickhouse:clickhouse /var/lib/clickhouse/access/

# Start ClickHouse
systemctl start clickhouse-server
```

Restore from SQL export:

```bash
clickhouse-client < /backup/users_export.sql
clickhouse-client < /backup/roles_export.sql
clickhouse-client < /backup/quotas_export.sql
```

## Verifying Access Control After Restore

```sql
SELECT name, storage FROM system.users ORDER BY name;
SELECT name FROM system.roles ORDER BY name;
SELECT name, keys FROM system.quotas ORDER BY name;
```

## Summary

ClickHouse access control backup requires copying `/var/lib/clickhouse/access/` and exporting SQL definitions for users, roles, quotas, and settings profiles. Keep both binary file backups and SQL exports for flexibility. Include access control backup in your regular backup schedule alongside data backups.

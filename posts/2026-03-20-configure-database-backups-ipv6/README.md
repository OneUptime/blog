# How to Configure Database Backups over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database Backup, IPv6, PostgreSQL, MySQL, MongoDB, Backup Strategy, DevOps

Description: Configure automated database backups (PostgreSQL, MySQL, MongoDB) to remote servers over IPv6 using native database tools and network-aware backup scripts.

---

Database backups over IPv6 require that backup utilities correctly specify IPv6 addresses for database connections and that backup transfer utilities (SSH, rsync) use proper IPv6 syntax. This guide covers the most common databases.

## PostgreSQL Backup over IPv6

### pg_dump via IPv6

```bash
# Backup PostgreSQL database to remote server over IPv6

PGPASSWORD="password" pg_dump \
  -h 2001:db8::db \
  -U dbadmin \
  -d myapp \
  -F c \
  -f /tmp/myapp_$(date +%Y%m%d).dump

# Stream backup directly to remote server
PGPASSWORD="password" pg_dump \
  -h 2001:db8::db \
  -U dbadmin \
  -d myapp \
  | gzip | ssh -6 backupuser@[2001:db8::backup] \
  "cat > /backups/myapp_$(date +%Y%m%d).sql.gz"
```

### pg_basebackup for Full Cluster Backup

```bash
# Full PostgreSQL cluster backup over IPv6
pg_basebackup \
  -h 2001:db8::db \
  -U replication_user \
  -D /backups/pgdata_$(date +%Y%m%d) \
  -P \
  -Ft \
  --wal-method=stream
```

### PostgreSQL Server Configuration for Remote Backup

```bash
# /etc/postgresql/15/main/pg_hba.conf
# Allow backup user from IPv6 backup server
host    all    dbadmin    2001:db8::backup/128    scram-sha-256
# Allow replication from IPv6
host    replication    replication_user    2001:db8::/48    scram-sha-256

# /etc/postgresql/15/main/postgresql.conf
listen_addresses = '2001:db8::db,::1,127.0.0.1'
```

## MySQL/MariaDB Backup over IPv6

```bash
# mysqldump over IPv6
mysqldump \
  -h 2001:db8::db \
  -u dbadmin \
  -p"password" \
  --all-databases \
  --single-transaction \
  --quick \
  | gzip > /backups/mysql_all_$(date +%Y%m%d).sql.gz

# Backup specific database
mysqldump \
  -h 2001:db8::db \
  -u dbadmin \
  -p"password" \
  myapp_db \
  > /backups/myapp_$(date +%Y%m%d).sql

# Note: MySQL client -h/--host uses the IPv6 literal directly; [] is for URIs/connection strings
```

### MySQL Server Configuration for IPv6 Backups

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
# Listen on IPv6 address
bind-address = ::
# Or specific IPv6 address:
# bind-address = 2001:db8::db
```

## MongoDB Backup over IPv6

```bash
# mongodump from IPv6 MongoDB instance
mongodump \
  --uri="mongodb://dbadmin:password@[2001:db8::db]:27017/mydb" \
  --out=/backups/mongo_$(date +%Y%m%d)

# mongodump with authentication and compression
mongodump \
  --host "[2001:db8::db]" \
  --port 27017 \
  --username dbadmin \
  --password password \
  --authenticationDatabase admin \
  --db mydb \
  --gzip \
  --archive=/backups/mydb_$(date +%Y%m%d).archive.gz
```

## Automated Multi-Database Backup Script

```bash
#!/bin/bash
# backup_databases_ipv6.sh

# Configuration
DB_HOST="2001:db8::db"
BACKUP_HOST="2001:db8::backup"
BACKUP_PATH="/backups/databases"
DATE=$(date +%Y%m%d-%H%M%S)
LOG="/var/log/db-backup.log"

log() { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $*" >> "$LOG"; }

# PostgreSQL backup
log "Starting PostgreSQL backup"
PGPASSWORD="pgpassword" pg_dumpall \
  -h "$DB_HOST" \
  -U postgres \
  | gzip | ssh -6 "backupuser@[$BACKUP_HOST]" \
  "cat > $BACKUP_PATH/postgres_all_$DATE.sql.gz" \
  && log "PostgreSQL backup complete" \
  || log "ERROR: PostgreSQL backup failed"

# MySQL backup
log "Starting MySQL backup"
mysqldump \
  -h "$DB_HOST" \
  -u root \
  -p"mysqlpass" \
  --all-databases \
  --single-transaction \
  | gzip | ssh -6 "backupuser@[$BACKUP_HOST]" \
  "cat > $BACKUP_PATH/mysql_all_$DATE.sql.gz" \
  && log "MySQL backup complete" \
  || log "ERROR: MySQL backup failed"

# MongoDB backup
log "Starting MongoDB backup"
mongodump \
  --host "[$DB_HOST]" \
  --gzip \
  --archive \
  | ssh -6 "backupuser@[$BACKUP_HOST]" \
  "cat > $BACKUP_PATH/mongo_all_$DATE.archive.gz" \
  && log "MongoDB backup complete" \
  || log "ERROR: MongoDB backup failed"

log "All database backups completed"
```

## Scheduling Database Backups

```bash
# Add to crontab for nightly database backups at 1am
0 1 * * * /usr/local/bin/backup_databases_ipv6.sh
```

Database backups over IPv6 are supported natively by all major database backup utilities - the key is using the correct IPv6 address format for each tool (for example, brackets in URIs/connection strings, but not for MySQL's `-h`/`--host` option) and ensuring database servers are configured to accept connections from IPv6 backup client addresses.

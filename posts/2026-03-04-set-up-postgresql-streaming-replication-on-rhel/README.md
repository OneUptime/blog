# How to Set Up PostgreSQL Streaming Replication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Streaming Replication, High Availability, Database

Description: Configure PostgreSQL streaming replication on RHEL with a primary and standby server for real-time data replication and read scaling.

---

PostgreSQL streaming replication continuously ships WAL (Write-Ahead Log) records from a primary server to one or more standby servers. The standby replays these records in real time, keeping an almost up-to-date copy of the database. This provides both high availability and read scaling.

## Configure the Primary Server

```bash
# Create a replication user
sudo -u postgres psql -c "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replpass123';"

# Edit postgresql.conf on the primary
sudo vi /var/lib/pgsql/data/postgresql.conf
```

Set these parameters in `postgresql.conf`:

```bash
# /var/lib/pgsql/data/postgresql.conf
listen_addresses = '*'
wal_level = replica
max_wal_senders = 5
wal_keep_size = 256
hot_standby = on
```

Configure `pg_hba.conf` to allow replication connections:

```bash
# Add to /var/lib/pgsql/data/pg_hba.conf
# Allow replication connections from the standby server
host    replication    replicator    192.168.1.51/32    scram-sha-256
```

```bash
# Restart the primary
sudo systemctl restart postgresql
```

## Set Up the Standby Server

```bash
# Stop PostgreSQL on the standby
sudo systemctl stop postgresql

# Remove the existing data directory on the standby
sudo rm -rf /var/lib/pgsql/data/*

# Use pg_basebackup to clone the primary
sudo -u postgres pg_basebackup \
    -h 192.168.1.50 \
    -U replicator \
    -D /var/lib/pgsql/data \
    -Fp -Xs -P -R

# The -R flag automatically creates standby.signal and
# sets primary_conninfo in postgresql.auto.conf
```

## Verify the Standby Configuration

```bash
# Check that standby.signal was created
ls -la /var/lib/pgsql/data/standby.signal

# Check primary_conninfo in postgresql.auto.conf
cat /var/lib/pgsql/data/postgresql.auto.conf
# Should contain:
# primary_conninfo = 'host=192.168.1.50 user=replicator password=replpass123'
```

## Start the Standby

```bash
# Start PostgreSQL on the standby
sudo systemctl start postgresql

# Verify it is running in recovery mode
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
# Should return: t (true)
```

## Verify Replication on the Primary

```bash
# Check replication status from the primary
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"

# Key columns:
# state      - should be "streaming"
# sent_lsn   - LSN sent to standby
# write_lsn  - LSN written on standby
# flush_lsn  - LSN flushed on standby
# replay_lsn - LSN replayed on standby
```

## Test Replication

```bash
# On the primary, create a test table
sudo -u postgres psql -c "CREATE TABLE reptest (id serial PRIMARY KEY, data text);"
sudo -u postgres psql -c "INSERT INTO reptest (data) VALUES ('hello from primary');"

# On the standby, verify the data appears
sudo -u postgres psql -c "SELECT * FROM reptest;"
```

## Monitor Replication Lag

```bash
# On the standby, check lag
sudo -u postgres psql -c "
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
"

# On the primary, check lag per standby
sudo -u postgres psql -c "
SELECT client_addr,
       sent_lsn - replay_lsn AS byte_lag
FROM pg_stat_replication;
"
```

## Open Firewall Ports

```bash
# On both servers
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

The standby server can serve read-only queries while continuously receiving updates from the primary. If the primary fails, you can promote the standby to become the new primary.

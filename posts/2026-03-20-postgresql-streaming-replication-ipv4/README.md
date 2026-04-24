# How to Set Up PostgreSQL Streaming Replication Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Streaming Replication, IPv4, High Availability, Database, WAL

Description: Learn how to configure PostgreSQL primary-standby streaming replication over IPv4 for real-time data replication and high availability.

---

PostgreSQL streaming replication continuously ships WAL (Write-Ahead Log) records from the primary to one or more standbys. The standby applies these records to maintain an up-to-date read-only copy of the primary.

## Architecture

```mermaid
graph LR
    A[Primary\n10.0.0.10:5432] -->|WAL Stream| B[Standby\n10.0.0.11:5432]
    C[App Server] -->|Read/Write| A
    D[Reporting] -->|Read-Only| B
```

## Primary Server Configuration

### postgresql.conf

```ini
# /etc/postgresql/15/main/postgresql.conf

# Bind to the primary's IPv4 address (and localhost)

listen_addresses = '10.0.0.10,127.0.0.1'

# WAL settings for streaming replication
wal_level = replica              # Minimum: replica
max_wal_senders = 5              # Allow up to 5 standby connections
wal_keep_size = 256              # Keep 256MB of WAL segments (for slow standbys)
max_replication_slots = 5        # Allow replication slots if needed

# Optional: synchronous replication (waits for standby confirmation before commit)
# synchronous_standby_names = 'standby1'   # Match the standby's application_name
```

### pg_hba.conf

```text
# /etc/postgresql/15/main/pg_hba.conf
# Allow the replication user from the standby server's IPv4 address
host    replication     replicator     10.0.0.11/32     scram-sha-256
```

```sql
-- Create the replication user on the primary
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'ReplPass123!';
```

```bash
# Restart PostgreSQL to apply these replication settings
pg_ctlcluster 15 main restart
```

## Standby Server Setup

### Step 1: Copy Primary Data

```bash
# Stop PostgreSQL on the standby first
pg_ctlcluster 15 main stop

# Create a base backup on the standby server
# /var/lib/postgresql/15/main must be empty before running this command
# Run as the postgres user
pg_basebackup \
  -h 10.0.0.10 \
  -U replicator \
  -D /var/lib/postgresql/15/main \
  -Fp \
  -Xs \
  -P
# Enter the replicator password when prompted
```

### Step 2: Configure postgresql.conf on Standby

```ini
# /etc/postgresql/15/main/postgresql.conf (on the standby)
listen_addresses = '10.0.0.11,127.0.0.1'
hot_standby = on    # Allow read-only queries while in standby mode
```

### Step 3: Create standby.signal and Connection Info

```bash
# In PostgreSQL 12+, create an empty standby.signal file
touch /var/lib/postgresql/15/main/standby.signal

# Add primary connection info to postgresql.conf (or recovery.conf for PG < 12)
cat >> /etc/postgresql/15/main/postgresql.conf << EOF
primary_conninfo = 'host=10.0.0.10 port=5432 user=replicator password=ReplPass123! application_name=standby1'
EOF
```

### Step 4: Start the Standby

```bash
pg_ctlcluster 15 main start
```

## Verifying Replication

```sql
-- On the primary: check connected standbys
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
FROM pg_stat_replication;

-- On the standby: check replay status
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(),
       pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() AS replay_caught_up;
-- replay_caught_up = t means the standby has replayed all WAL it has received
```

## Key Takeaways

- Set `wal_level = replica` and `max_wal_senders >= 1` on the primary.
- Use `pg_basebackup` to copy the primary's data directory to the standby.
- Create `standby.signal` (PG 12+) and set `primary_conninfo` on the standby.
- Monitor lag with `pg_stat_replication` on the primary and `pg_last_wal_receive_lsn()` / `pg_last_wal_replay_lsn()` on the standby.

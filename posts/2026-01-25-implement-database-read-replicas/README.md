# How to Implement Database Read Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Performance, PostgreSQL, MySQL, Scaling

Description: Learn how to implement database read replicas to scale read-heavy workloads. This guide covers replica setup, connection routing, handling replication lag, and best practices for read/write splitting.

---

Most applications read data far more often than they write it. A typical web application might have a 90/10 read/write ratio. Running all these queries against a single database creates a bottleneck that no amount of hardware can solve. Read replicas distribute read queries across multiple database instances, multiplying your read capacity.

This guide covers practical implementation of read replicas with PostgreSQL and MySQL.

## Read Replica Architecture

```mermaid
flowchart TD
    App[Application] --> Router[Connection Router]
    Router -->|Writes| Primary[(Primary DB)]
    Router -->|Reads| R1[(Replica 1)]
    Router -->|Reads| R2[(Replica 2)]
    Router -->|Reads| R3[(Replica 3)]

    Primary -->|Replication| R1
    Primary -->|Replication| R2
    Primary -->|Replication| R3
```

| Benefit | Description |
|---------|-------------|
| Read scaling | Each replica handles read queries independently |
| Geographic distribution | Place replicas closer to users |
| Analytics isolation | Run reports without impacting production |
| Backup source | Replicas can serve as backup sources |

## PostgreSQL Streaming Replication

### Primary Server Configuration

```bash
# postgresql.conf on primary

# Enable WAL archiving
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB

# Synchronous replication (optional - impacts write latency)
# synchronous_standby_names = 'replica1,replica2'
synchronous_commit = on

# Monitoring
track_commit_timestamp = on
```

```bash
# pg_hba.conf - Allow replication connections
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     replicator      10.0.0.0/8             scram-sha-256
```

Create replication user:

```sql
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secure_password';
```

### Replica Server Setup

```bash
# Stop PostgreSQL on replica
sudo systemctl stop postgresql

# Remove existing data (CAREFUL!)
sudo rm -rf /var/lib/postgresql/14/main/*

# Create base backup from primary
pg_basebackup -h primary_host -D /var/lib/postgresql/14/main \
  -U replicator -P -v -R -X stream -C -S replica1
```

```bash
# postgresql.conf on replica
hot_standby = on
hot_standby_feedback = on  # Prevents query conflicts

# Recovery settings (PostgreSQL 12+)
primary_conninfo = 'host=primary_host port=5432 user=replicator password=secure_password'
primary_slot_name = 'replica1'
```

Start the replica:

```bash
sudo systemctl start postgresql
```

Verify replication:

```sql
-- On primary
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
FROM pg_stat_replication;

-- On replica
SELECT pg_is_in_recovery();  -- Should return true
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();
```

## MySQL Replication Setup

### Primary Server Configuration

```ini
# my.cnf on primary

[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_expire_logs_seconds = 604800  # 7 days

# For GTID-based replication (recommended)
gtid_mode = ON
enforce_gtid_consistency = ON
```

Create replication user:

```sql
CREATE USER 'replicator'@'%' IDENTIFIED BY 'secure_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
```

### Replica Server Configuration

```ini
# my.cnf on replica

[mysqld]
server-id = 2
read_only = ON
super_read_only = ON
relay_log = /var/log/mysql/mysql-relay-bin.log

# GTID replication
gtid_mode = ON
enforce_gtid_consistency = ON
```

Start replication:

```sql
-- On replica
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'primary_host',
  SOURCE_USER = 'replicator',
  SOURCE_PASSWORD = 'secure_password',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;

-- Verify
SHOW REPLICA STATUS\G
```

## Application-Level Read/Write Splitting

### Node.js Implementation

```javascript
const { Pool } = require('pg');

class DatabaseRouter {
  constructor(config) {
    // Primary for writes
    this.primary = new Pool({
      host: config.primary.host,
      port: config.primary.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 20
    });

    // Replicas for reads
    this.replicas = config.replicas.map(replica => new Pool({
      host: replica.host,
      port: replica.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 20
    }));

    this.currentReplica = 0;
    this.maxLagMs = config.maxLagMs || 1000;
  }

  // Round-robin replica selection
  getReadPool() {
    const pool = this.replicas[this.currentReplica];
    this.currentReplica = (this.currentReplica + 1) % this.replicas.length;
    return pool;
  }

  // Execute write query on primary
  async write(query, params) {
    return this.primary.query(query, params);
  }

  // Execute read query on replica
  async read(query, params) {
    const pool = this.getReadPool();
    return pool.query(query, params);
  }

  // Read from primary when consistency is critical
  async readFromPrimary(query, params) {
    return this.primary.query(query, params);
  }

  // Transaction support (always on primary)
  async transaction(callback) {
    const client = await this.primary.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.primary.end();
    await Promise.all(this.replicas.map(r => r.end()));
  }
}

// Usage
const db = new DatabaseRouter({
  primary: { host: 'primary.db.example.com', port: 5432 },
  replicas: [
    { host: 'replica1.db.example.com', port: 5432 },
    { host: 'replica2.db.example.com', port: 5432 }
  ],
  database: 'myapp',
  user: 'app_user',
  password: 'password',
  maxLagMs: 1000
});

// Read queries go to replicas
const users = await db.read('SELECT * FROM users WHERE active = true');

// Write queries go to primary
await db.write('INSERT INTO users (name, email) VALUES ($1, $2)', ['John', 'john@example.com']);

// Critical reads from primary
const user = await db.readFromPrimary('SELECT * FROM users WHERE id = $1', [userId]);
```

### Python Implementation with SQLAlchemy

```python
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
import random

class DatabaseRouter:
    def __init__(self, primary_url: str, replica_urls: list):
        # Primary engine for writes
        self.primary = create_engine(
            primary_url,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=5,
            pool_pre_ping=True
        )

        # Replica engines for reads
        self.replicas = [
            create_engine(
                url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=5,
                pool_pre_ping=True
            )
            for url in replica_urls
        ]

        self.PrimarySession = sessionmaker(bind=self.primary)
        self.ReplicaSessions = [
            sessionmaker(bind=replica)
            for replica in self.replicas
        ]

    def get_read_session(self) -> Session:
        """Get session from random replica."""
        SessionClass = random.choice(self.ReplicaSessions)
        return SessionClass()

    def get_write_session(self) -> Session:
        """Get session for write operations."""
        return self.PrimarySession()

    def execute_read(self, query, params=None):
        """Execute read query on replica."""
        session = self.get_read_session()
        try:
            result = session.execute(query, params or {})
            return result.fetchall()
        finally:
            session.close()

    def execute_write(self, query, params=None):
        """Execute write query on primary."""
        session = self.get_write_session()
        try:
            result = session.execute(query, params or {})
            session.commit()
            return result
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# Usage
db = DatabaseRouter(
    primary_url='postgresql://user:pass@primary:5432/mydb',
    replica_urls=[
        'postgresql://user:pass@replica1:5432/mydb',
        'postgresql://user:pass@replica2:5432/mydb'
    ]
)

# Read from replica
users = db.execute_read('SELECT * FROM users WHERE active = true')

# Write to primary
db.execute_write(
    'INSERT INTO users (name, email) VALUES (:name, :email)',
    {'name': 'John', 'email': 'john@example.com'}
)
```

## Handling Replication Lag

### Monitor Lag

```sql
-- PostgreSQL: Check replication lag
SELECT
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    replay_lag
FROM pg_stat_replication;

-- MySQL: Check replication lag
SHOW REPLICA STATUS\G
-- Look for Seconds_Behind_Source
```

### Lag-Aware Routing

```javascript
class LagAwareRouter {
  constructor(config) {
    this.primary = new Pool(config.primary);
    this.replicas = config.replicas.map(r => ({
      pool: new Pool(r),
      host: r.host,
      lagMs: 0
    }));

    this.maxAcceptableLag = config.maxLagMs || 1000;

    // Monitor lag periodically
    setInterval(() => this.updateLagMetrics(), 5000);
  }

  async updateLagMetrics() {
    for (const replica of this.replicas) {
      try {
        const result = await replica.pool.query(`
          SELECT
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms
        `);
        replica.lagMs = result.rows[0]?.lag_ms || 0;
      } catch (error) {
        replica.lagMs = Infinity;
      }
    }
  }

  getHealthyReplica() {
    const healthy = this.replicas.filter(r => r.lagMs < this.maxAcceptableLag);

    if (healthy.length === 0) {
      console.warn('No healthy replicas, falling back to primary');
      return null;
    }

    // Return replica with lowest lag
    return healthy.reduce((a, b) => a.lagMs < b.lagMs ? a : b);
  }

  async read(query, params, options = {}) {
    // For time-sensitive reads, use primary
    if (options.requireFresh) {
      return this.primary.query(query, params);
    }

    const replica = this.getHealthyReplica();

    if (!replica) {
      return this.primary.query(query, params);
    }

    return replica.pool.query(query, params);
  }

  async readAfterWrite(query, params, writeTimestamp) {
    // If write was recent, read from primary
    const timeSinceWrite = Date.now() - writeTimestamp;

    if (timeSinceWrite < this.maxAcceptableLag) {
      return this.primary.query(query, params);
    }

    return this.read(query, params);
  }
}

// Usage
const router = new LagAwareRouter({
  primary: { host: 'primary', port: 5432, database: 'mydb' },
  replicas: [
    { host: 'replica1', port: 5432, database: 'mydb' },
    { host: 'replica2', port: 5432, database: 'mydb' }
  ],
  maxLagMs: 1000
});

// Normal read (can use any healthy replica)
const products = await router.read('SELECT * FROM products');

// Read that must be fresh (uses primary)
const balance = await router.read(
  'SELECT balance FROM accounts WHERE id = $1',
  [accountId],
  { requireFresh: true }
);

// Read after write (waits for replication or uses primary)
await router.write('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
const writeTime = Date.now();
const user = await router.readAfterWrite(
  'SELECT * FROM users WHERE id = $1',
  [userId],
  writeTime
);
```

## Connection Pooling with PgBouncer

For high connection counts, use PgBouncer in front of replicas:

```ini
# pgbouncer.ini

[databases]
# Writes go to primary
mydb_write = host=primary port=5432 dbname=mydb

# Reads distributed across replicas
mydb_read = host=replica1,replica2 port=5432 dbname=mydb load_balance_hosts=round-robin

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Connection pooling
pool_mode = transaction
default_pool_size = 20
min_pool_size = 5
max_client_conn = 1000
```

Application connects to PgBouncer:

```javascript
const dbWrite = new Pool({
  host: 'pgbouncer',
  port: 6432,
  database: 'mydb_write'
});

const dbRead = new Pool({
  host: 'pgbouncer',
  port: 6432,
  database: 'mydb_read'
});
```

## Summary

Read replicas are essential for scaling read-heavy workloads. Key considerations:

| Aspect | Recommendation |
|--------|----------------|
| Replication type | Streaming/async for most cases |
| Replica count | 2-3 for availability, more for scale |
| Lag tolerance | Define per-query based on consistency needs |
| Connection routing | Application-level or proxy-based |
| Failover | Automated promotion of replica to primary |

Start with one replica and add more as needed. Monitor replication lag continuously and route queries appropriately. For critical reads that cannot tolerate stale data, always read from the primary.

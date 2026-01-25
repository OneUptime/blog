# How to Configure Read Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, PostgreSQL, MySQL, Read Replicas, Scalability, Performance

Description: Learn how to configure read replicas to scale your database reads and improve application performance.

---

Read replicas are copies of your primary database that handle read queries, distributing the load and improving performance. This guide walks you through setting up and configuring read replicas for PostgreSQL and MySQL, along with application-level routing strategies.

---

## Read Replica Architecture

```mermaid
graph TD
    subgraph Application Layer
        A[Application Server 1]
        B[Application Server 2]
        C[Application Server 3]
    end

    subgraph Database Layer
        D[Primary Database<br/>Writes + Reads]
        E[Read Replica 1]
        F[Read Replica 2]
        G[Read Replica 3]
    end

    A -->|writes| D
    B -->|writes| D
    C -->|writes| D

    A -->|reads| E
    B -->|reads| F
    C -->|reads| G

    D -->|replication| E
    D -->|replication| F
    D -->|replication| G
```

---

## PostgreSQL Streaming Replication Setup

### Primary Server Configuration

```bash
# postgresql.conf on primary server

# Enable WAL archiving for replication
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB

# Allow replication connections
max_replication_slots = 10

# Synchronous replication (optional, for strong consistency)
# synchronous_standby_names = 'replica1,replica2'
```

```bash
# pg_hba.conf - Allow replication connections

# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     replicator      10.0.0.0/8              scram-sha-256
host    replication     replicator      192.168.0.0/16          scram-sha-256
```

### Create Replication User

```sql
-- Run on primary server
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secure_password_here';
```

### Replica Server Setup

```bash
# Stop PostgreSQL on replica server
sudo systemctl stop postgresql

# Clear data directory
sudo rm -rf /var/lib/postgresql/14/main/*

# Take base backup from primary
sudo -u postgres pg_basebackup \
    -h primary.example.com \
    -D /var/lib/postgresql/14/main \
    -U replicator \
    -P \
    -v \
    -R \
    -X stream \
    -C \
    -S replica1_slot

# The -R flag creates standby.signal and configures recovery
```

```bash
# postgresql.conf on replica server

# Replica configuration
hot_standby = on
primary_conninfo = 'host=primary.example.com port=5432 user=replicator password=secure_password_here'
primary_slot_name = 'replica1_slot'
```

---

## MySQL Replication Setup

### Primary Server Configuration

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf on primary

[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_do_db = your_database

# Enable GTID for easier failover
gtid_mode = ON
enforce_gtid_consistency = ON

# Performance tuning
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

### Create Replication User

```sql
-- Run on primary server
CREATE USER 'replicator'@'%' IDENTIFIED BY 'secure_password_here';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;

-- Get binary log position
SHOW MASTER STATUS;
```

### Replica Server Configuration

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf on replica

[mysqld]
server-id = 2
relay_log = /var/log/mysql/mysql-relay-bin.log
read_only = ON

# Enable GTID
gtid_mode = ON
enforce_gtid_consistency = ON

# Replica specific settings
replica_skip_errors = 1062  # Skip duplicate key errors (use carefully)
```

### Start Replication

```sql
-- Run on replica server
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='primary.example.com',
    SOURCE_USER='replicator',
    SOURCE_PASSWORD='secure_password_here',
    SOURCE_AUTO_POSITION=1;  -- Uses GTID

START REPLICA;

-- Check status
SHOW REPLICA STATUS\G
```

---

## Application-Level Read/Write Splitting

### Node.js with Knex

```javascript
// database.js
const knex = require('knex');

// Primary connection for writes
const primary = knex({
    client: 'pg',
    connection: {
        host: 'primary.example.com',
        port: 5432,
        user: 'app_user',
        password: process.env.DB_PASSWORD,
        database: 'myapp'
    },
    pool: { min: 2, max: 10 }
});

// Replica connections for reads
const replicas = [
    knex({
        client: 'pg',
        connection: {
            host: 'replica1.example.com',
            port: 5432,
            user: 'app_user',
            password: process.env.DB_PASSWORD,
            database: 'myapp'
        },
        pool: { min: 2, max: 10 }
    }),
    knex({
        client: 'pg',
        connection: {
            host: 'replica2.example.com',
            port: 5432,
            user: 'app_user',
            password: process.env.DB_PASSWORD,
            database: 'myapp'
        },
        pool: { min: 2, max: 10 }
    })
];

// Round-robin replica selection
let replicaIndex = 0;

function getReadConnection() {
    const replica = replicas[replicaIndex];
    replicaIndex = (replicaIndex + 1) % replicas.length;
    return replica;
}

function getWriteConnection() {
    return primary;
}

// Database wrapper with automatic routing
class Database {
    static async query(sql, params, options = {}) {
        const { write = false } = options;
        const connection = write ? getWriteConnection() : getReadConnection();
        return connection.raw(sql, params);
    }

    static async insert(table, data) {
        return getWriteConnection()(table).insert(data).returning('*');
    }

    static async update(table, id, data) {
        return getWriteConnection()(table).where('id', id).update(data).returning('*');
    }

    static async delete(table, id) {
        return getWriteConnection()(table).where('id', id).del();
    }

    static async findById(table, id) {
        return getReadConnection()(table).where('id', id).first();
    }

    static async findAll(table, conditions = {}) {
        return getReadConnection()(table).where(conditions);
    }
}

module.exports = { Database, primary, replicas };
```

---

### Python with SQLAlchemy

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from contextlib import contextmanager
import random

class DatabaseRouter:
    def __init__(self, primary_url: str, replica_urls: list[str]):
        # Create primary engine for writes
        self.primary_engine = create_engine(
            primary_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True
        )

        # Create replica engines for reads
        self.replica_engines = [
            create_engine(
                url,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True
            )
            for url in replica_urls
        ]

        # Session factories
        self.PrimarySession = sessionmaker(bind=self.primary_engine)
        self.ReplicaSessions = [
            sessionmaker(bind=engine)
            for engine in self.replica_engines
        ]

    def get_write_session(self):
        """Get a session connected to the primary database"""
        return self.PrimarySession()

    def get_read_session(self):
        """Get a session connected to a random replica"""
        session_factory = random.choice(self.ReplicaSessions)
        return session_factory()

    @contextmanager
    def write_context(self):
        """Context manager for write operations"""
        session = self.get_write_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    @contextmanager
    def read_context(self):
        """Context manager for read operations"""
        session = self.get_read_session()
        try:
            yield session
        finally:
            session.close()


# Usage example
router = DatabaseRouter(
    primary_url='postgresql://user:pass@primary:5432/myapp',
    replica_urls=[
        'postgresql://user:pass@replica1:5432/myapp',
        'postgresql://user:pass@replica2:5432/myapp',
    ]
)

# Write operation
with router.write_context() as session:
    user = User(name='John', email='john@example.com')
    session.add(user)

# Read operation
with router.read_context() as session:
    users = session.query(User).filter(User.active == True).all()
```

---

## Replication Lag Monitoring

```mermaid
graph LR
    A[Primary] -->|Write| B[WAL/Binlog]
    B -->|Stream| C[Replica]
    C -->|Apply| D[Data]

    E[Monitor] -->|Check| F[Lag Time]
    F -->|Alert if| G[Lag > Threshold]
```

### PostgreSQL Lag Monitoring

```sql
-- Check replication lag on replica
SELECT
    pg_last_wal_receive_lsn() AS received,
    pg_last_wal_replay_lsn() AS replayed,
    pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag_bytes,
    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;
```

### MySQL Lag Monitoring

```sql
-- Check replication lag on replica
SHOW REPLICA STATUS\G

-- Key fields to monitor:
-- Seconds_Behind_Source: replication delay in seconds
-- Replica_IO_Running: should be Yes
-- Replica_SQL_Running: should be Yes
```

---

## Handling Replication Lag in Application

```javascript
// lag-aware-routing.js
const { primary, replicas, Database } = require('./database');

class LagAwareRouter {
    constructor() {
        this.replicaLags = new Map();
        this.maxAcceptableLag = 5000; // 5 seconds in milliseconds

        // Start monitoring lag
        this.startLagMonitoring();
    }

    async checkReplicaLag(replica, index) {
        try {
            const result = await replica.raw(`
                SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms
            `);
            const lagMs = result.rows[0]?.lag_ms || 0;
            this.replicaLags.set(index, lagMs);
            return lagMs;
        } catch (error) {
            // If we can't check, assume high lag
            this.replicaLags.set(index, Infinity);
            return Infinity;
        }
    }

    startLagMonitoring() {
        // Check lag every 5 seconds
        setInterval(async () => {
            for (let i = 0; i < replicas.length; i++) {
                await this.checkReplicaLag(replicas[i], i);
            }
        }, 5000);
    }

    getHealthyReplica() {
        // Find replicas with acceptable lag
        const healthyIndices = [];

        for (let i = 0; i < replicas.length; i++) {
            const lag = this.replicaLags.get(i) || 0;
            if (lag < this.maxAcceptableLag) {
                healthyIndices.push(i);
            }
        }

        if (healthyIndices.length === 0) {
            // All replicas have high lag, fall back to primary
            console.warn('All replicas have high lag, routing reads to primary');
            return primary;
        }

        // Random selection from healthy replicas
        const index = healthyIndices[Math.floor(Math.random() * healthyIndices.length)];
        return replicas[index];
    }

    async read(query, params) {
        const connection = this.getHealthyReplica();
        return connection.raw(query, params);
    }

    async readAfterWrite(query, params, options = {}) {
        // For read-after-write consistency, use primary
        const { usePrimary = true } = options;
        const connection = usePrimary ? primary : this.getHealthyReplica();
        return connection.raw(query, params);
    }
}

module.exports = new LagAwareRouter();
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Monitor replication lag | Set up alerts for lag exceeding thresholds |
| Use connection pooling | Reduce connection overhead to all databases |
| Handle failover gracefully | Have a plan when replicas become unavailable |
| Consider read-after-write | Route recent writes to primary for consistency |
| Load balance across replicas | Distribute read load evenly |
| Separate reporting queries | Use dedicated replicas for heavy analytics |

---

## Common Issues and Solutions

1. **Replication lag during high write load**: Increase replica resources or add more replicas
2. **Connection exhaustion**: Use connection pooling with appropriate limits
3. **Stale reads after writes**: Implement read-after-write routing to primary
4. **Replica falling behind**: Check network bandwidth, disk I/O, and replica resources
5. **Split-brain scenario**: Use proper fencing and consensus mechanisms

---

## Summary

Configuring read replicas involves:

1. Setting up replication on the database level (streaming replication for PostgreSQL, binary log replication for MySQL)
2. Implementing application-level routing to direct writes to primary and reads to replicas
3. Monitoring replication lag and routing traffic away from lagging replicas
4. Handling edge cases like read-after-write consistency

With proper configuration, read replicas can significantly improve your application's read throughput and overall performance.

---

*Monitor your database replication health with [OneUptime](https://oneuptime.com). Track replication lag, connection pools, and query performance across your primary and replica databases.*

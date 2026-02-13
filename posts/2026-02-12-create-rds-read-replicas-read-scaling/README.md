# How to Create RDS Read Replicas for Read Scaling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Read Replicas, Database, Scaling

Description: Learn how to create and configure RDS read replicas to scale read-heavy database workloads and reduce load on your primary instance.

---

Most applications read far more data than they write. User profiles, product catalogs, dashboards, reports - all reads. If your primary database is straining under read load, you don't necessarily need a bigger instance. Instead, you can create read replicas to distribute read traffic across multiple copies of your database.

## How Read Replicas Work

A read replica is an asynchronous copy of your primary database. Writes go to the primary, and RDS automatically replicates those changes to each replica. Your application can then send read queries to the replicas, taking load off the primary.

```mermaid
graph TD
    A[Application] -->|Writes| B[Primary Instance]
    A -->|Reads| C[Read Replica 1]
    A -->|Reads| D[Read Replica 2]
    A -->|Reads| E[Read Replica 3]
    B -->|Async Replication| C
    B -->|Async Replication| D
    B -->|Async Replication| E
```

Key characteristics:
- Replication is **asynchronous** - there's a small delay (replica lag) before replicas have the latest data
- Replicas are **read-only** - you can't write to them
- Each replica has its own **endpoint** - you choose which queries go where
- You can have up to **15 read replicas** for MySQL/MariaDB and **5** for PostgreSQL, Oracle, and SQL Server

## Creating a Read Replica

Creating a replica is a single command. RDS takes a snapshot of the primary and restores it to create the replica, then sets up replication.

This creates a read replica from an existing RDS instance.

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier my-db-replica-1 \
  --source-db-instance-identifier my-primary-db \
  --db-instance-class db.r6g.large \
  --availability-zone us-east-1b \
  --no-publicly-accessible \
  --tags Key=Role,Value=read-replica Key=Environment,Value=production
```

The replica uses the same engine, storage type, and parameter group as the primary by default. You can specify a different instance class - a common pattern is using a larger instance for replicas that handle heavy reporting queries.

### Storage Considerations

Read replicas can have different storage configurations than the primary:
- Storage type can differ (e.g., primary on io1, replica on gp3 for cost savings)
- Storage autoscaling is configured independently
- Replicas start with the same allocated storage as the primary

## Creating Multiple Replicas

Create multiple replicas for distributing load or serving different purposes.

This creates three replicas in different AZs for better distribution.

```bash
# Replica for real-time reads
aws rds create-db-instance-read-replica \
  --db-instance-identifier my-db-replica-1 \
  --source-db-instance-identifier my-primary-db \
  --db-instance-class db.r6g.large \
  --availability-zone us-east-1a

# Replica for reporting/analytics
aws rds create-db-instance-read-replica \
  --db-instance-identifier my-db-reporting \
  --source-db-instance-identifier my-primary-db \
  --db-instance-class db.r6g.xlarge \
  --availability-zone us-east-1b

# Replica in a different region for DR
aws rds create-db-instance-read-replica \
  --db-instance-identifier my-db-dr-replica \
  --source-db-instance-identifier arn:aws:rds:us-east-1:123456789:db:my-primary-db \
  --db-instance-class db.r6g.large \
  --region us-west-2
```

Note: Cross-region replicas require the source to be specified as an ARN, not just the instance identifier.

## Monitoring Replica Lag

Replica lag is the delay between a write on the primary and when it appears on the replica. This is the most important metric for read replicas.

This command checks the replica lag for all your replicas.

```bash
# Check replica lag
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value=my-db-replica-1 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average \
  --unit Seconds
```

Typical replica lag is under 1 second for most workloads. If you see lag creeping up, the replica might be undersized or the primary's write workload might be too heavy for asynchronous replication to keep up.

## Application-Level Read/Write Splitting

RDS doesn't automatically route reads to replicas. Your application needs to send writes to the primary endpoint and reads to the replica endpoint.

### Python with SQLAlchemy

This SQLAlchemy configuration routes reads to replicas and writes to the primary.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Primary for writes
write_engine = create_engine(
    'postgresql://admin:password@my-primary-db.abc123.rds.amazonaws.com:5432/myappdb',
    pool_size=10,
    pool_pre_ping=True
)

# Replica for reads
read_engine = create_engine(
    'postgresql://admin:password@my-db-replica-1.abc123.rds.amazonaws.com:5432/myappdb',
    pool_size=20,
    pool_pre_ping=True
)

class RoutingSession(Session):
    def get_bind(self, mapper=None, clause=None):
        if self._flushing or self.is_modified():
            return write_engine
        return read_engine

# Usage
session = RoutingSession()
# Reads go to replica
users = session.query(User).filter_by(active=True).all()
# Writes go to primary
session.add(User(name='New User'))
session.commit()
```

### Node.js with Separate Pools

This Node.js code creates separate connection pools for reads and writes.

```javascript
const { Pool } = require('pg');

// Primary pool for writes
const writePool = new Pool({
  host: 'my-primary-db.abc123.rds.amazonaws.com',
  port: 5432,
  database: 'myappdb',
  user: 'admin',
  password: 'password',
  max: 10
});

// Replica pool for reads
const readPool = new Pool({
  host: 'my-db-replica-1.abc123.rds.amazonaws.com',
  port: 5432,
  database: 'myappdb',
  user: 'admin',
  password: 'password',
  max: 20
});

// Read function
async function findUser(id) {
  const result = await readPool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// Write function
async function createUser(name, email) {
  const result = await writePool.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  return result.rows[0];
}
```

### Handling Replica Lag in Application Code

Sometimes you need to read data immediately after writing it. Since replicas lag behind, the data might not be there yet. Handle this by routing critical reads to the primary.

```python
def create_order(user_id, items):
    # Write to primary
    order = Order(user_id=user_id, items=items)
    write_session.add(order)
    write_session.commit()

    # Read from PRIMARY, not replica (data might not be replicated yet)
    return write_session.query(Order).get(order.id)

def list_orders(user_id):
    # Read from replica (slight lag is acceptable)
    return read_session.query(Order).filter_by(user_id=user_id).all()
```

## Load Balancing Across Replicas

If you have multiple replicas, distribute read traffic across them. A simple approach is round-robin at the application level.

This Python code load-balances reads across multiple replicas.

```python
import itertools
from sqlalchemy import create_engine

replica_endpoints = [
    'my-db-replica-1.abc123.rds.amazonaws.com',
    'my-db-replica-2.abc123.rds.amazonaws.com',
    'my-db-replica-3.abc123.rds.amazonaws.com'
]

# Create a pool of read engines
read_engines = [
    create_engine(
        f'postgresql://admin:password@{endpoint}:5432/myappdb',
        pool_size=10,
        pool_pre_ping=True
    )
    for endpoint in replica_endpoints
]

# Round-robin iterator
engine_cycle = itertools.cycle(read_engines)

def get_read_engine():
    return next(engine_cycle)
```

Alternatively, use [RDS Proxy](https://oneuptime.com/blog/post/2026-02-12-setup-rds-proxy-connection-pooling/view) with reader endpoints for automatic load balancing.

## Scaling Replicas with Different Sizes

Not all replicas need the same instance class. Tailor them to their purpose:

- **API reads**: Same instance class as primary for consistent performance
- **Reporting queries**: Larger instance class to handle complex queries
- **Backup/ETL source**: Smaller instance class since it's not user-facing

## When to Add More Replicas

Add replicas when:
- Primary CPU is high due to read traffic
- Read latency is increasing
- You need geographic distribution of reads
- Different workloads (API vs reporting) need isolation

Remove replicas when:
- Replica CPU is consistently low
- Costs outweigh the performance benefit
- You've optimized queries enough that fewer replicas suffice

## Wrapping Up

Read replicas are one of the most effective ways to scale a read-heavy database workload on RDS. The setup is straightforward - create the replica and point read traffic at it. The complexity is in your application: deciding which queries go to replicas, handling replica lag for recently written data, and load balancing across multiple replicas. Get these patterns right and you can scale read capacity almost linearly by adding more replicas. For monitoring your replicas, check out [AWS infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) to track replica lag and performance metrics.

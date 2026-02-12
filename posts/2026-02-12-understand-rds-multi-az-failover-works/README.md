# How RDS Multi-AZ Failover Works

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, High Availability, Multi-AZ, Failover

Description: A deep dive into how RDS Multi-AZ failover works under the hood, what triggers it, and how to ensure your application handles it correctly.

---

Multi-AZ is great for availability, but it's not magic. Understanding what actually happens during a failover helps you design applications that handle it gracefully. In this post, we'll dig into the mechanics of RDS Multi-AZ failover - what triggers it, what happens step by step, how long it takes, and what you need to do in your application to survive it.

## The Replication Model

Before we talk about failover, let's understand how replication works.

In a Multi-AZ Instance deployment, RDS uses synchronous replication. Every write to the primary is simultaneously sent to the standby. The write is not acknowledged to your application until both the primary AND the standby have written it to disk.

```mermaid
sequenceDiagram
    participant App as Application
    participant P as Primary DB
    participant S as Standby DB
    App->>P: INSERT INTO orders...
    P->>P: Write to disk
    P->>S: Replicate write
    S->>S: Write to disk
    S->>P: Acknowledge
    P->>App: Write confirmed
```

This synchronous model means:
- **Zero data loss** during failover - the standby has every committed transaction
- **Slightly higher write latency** - writes wait for both instances to confirm
- The performance impact is typically 2-5ms of additional write latency

For Multi-AZ Cluster deployments, replication is semi-synchronous. At least one of the two readers must acknowledge the write before it's confirmed, which provides a balance between durability and performance.

## What Triggers Automatic Failover

RDS monitors the primary instance and triggers failover when it detects:

1. **Instance failure**: The primary instance becomes unresponsive
2. **AZ outage**: The entire availability zone hosting the primary goes down
3. **Storage failure**: The EBS volume backing the primary fails
4. **Network connectivity loss**: The primary loses network connectivity

RDS also triggers failover during planned operations:

5. **Instance class modification**: When you change the instance size
6. **OS patching**: During maintenance window updates
7. **Engine upgrades**: When applying minor version upgrades

For planned operations, RDS performs the change on the standby first, then fails over, then updates the old primary. This minimizes downtime.

## The Failover Process Step by Step

Here's exactly what happens during a failover:

### Step 1: Detection (0-30 seconds)

RDS detects that the primary is unavailable. The detection mechanism depends on the failure type. Hardware failures are detected quickly (seconds). Network partitions might take longer to confirm.

### Step 2: Standby Promotion (10-30 seconds)

RDS promotes the standby to become the new primary. This involves:
- Opening the standby for read/write traffic
- Applying any remaining transaction logs
- Starting the database engine in read-write mode

### Step 3: DNS Update (10-30 seconds)

RDS updates the DNS record for your database endpoint to point to the new primary's IP address. This is a CNAME update with a short TTL (typically 5 seconds).

### Step 4: Old Primary Recovery

After the failover completes, RDS attempts to recover the old primary. If the instance or AZ comes back online, it becomes the new standby and resynchronizes with the current primary.

The total failover time is typically 60-120 seconds for Multi-AZ Instance and about 35 seconds for Multi-AZ Cluster.

## Monitoring Failover Events

RDS publishes events during failover. You can subscribe to these through SNS.

This creates an SNS subscription for RDS failover events.

```bash
# Create an event subscription for failover events
aws rds create-event-subscription \
  --subscription-name failover-alerts \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789:rds-alerts \
  --source-type db-instance \
  --event-categories '["failover"]' \
  --source-ids my-ha-db \
  --enabled
```

You can also check recent events via the CLI.

```bash
# Check recent events for your instance
aws rds describe-events \
  --source-identifier my-ha-db \
  --source-type db-instance \
  --duration 1440 \
  --query 'Events[?contains(EventCategories, `failover`)]'
```

Key event messages you'll see:

- "Multi-AZ instance failover started" - Failover has begun
- "Multi-AZ instance failover complete" - New primary is serving traffic
- "Completed failover to DB instance" - Includes the new AZ

## What Your Application Experiences

From your application's perspective, here's the timeline during a failover:

1. **Connection drops**: Existing database connections are terminated
2. **Connection failures**: New connection attempts fail for 60-120 seconds
3. **DNS resolution changes**: The endpoint now resolves to the new primary
4. **Connections succeed**: New connections reach the new primary

The critical thing is that your application must handle connection failures gracefully. If it crashes or hangs when the database is unreachable, failover doesn't help.

## Making Your Application Failover-Ready

### Implement Connection Retry Logic

The most important thing is retrying failed connections with backoff.

This Node.js code implements connection retry with exponential backoff.

```javascript
const { Pool } = require('pg');

class ResilientPool {
  constructor(config) {
    this.config = {
      ...config,
      connectionTimeoutMillis: 5000,
      max: 20,
    };
    this.pool = new Pool(this.config);
  }

  async query(text, params, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.pool.query(text, params);
      } catch (error) {
        const isConnectionError =
          error.code === 'ECONNREFUSED' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === '57P01'; // admin shutdown

        if (isConnectionError && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`DB connection error, retry ${attempt}/${retries} in ${delay}ms`);

          // Recreate pool to force new DNS resolution
          await this.pool.end().catch(() => {});
          this.pool = new Pool(this.config);

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
}
```

### Avoid DNS Caching

Many runtime environments cache DNS lookups. During failover, stale DNS entries point to the old primary.

For Java applications, configure the JVM's DNS TTL.

```java
// Set in your application startup or as JVM flags
// -Dsun.net.inetaddr.ttl=30
java.security.Security.setProperty("networkaddress.cache.ttl", "30");
```

For Python, the `psycopg2` driver resolves DNS on each new connection by default, which is the correct behavior.

For Node.js, the default `dns.lookup` caches results based on the OS resolver. You can use a custom lookup function.

```javascript
const dns = require('dns');

const pool = new Pool({
  host: 'my-ha-db.abc123.us-east-1.rds.amazonaws.com',
  // Force fresh DNS lookup on each connection
  lookup: (hostname, options, callback) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) return callback(err);
      callback(null, addresses[0], 4);
    });
  }
});
```

### Connection Pool Configuration

Configure your connection pool to detect and replace stale connections.

```python
# SQLAlchemy connection pool with failover-friendly settings
from sqlalchemy import create_engine

engine = create_engine(
    'postgresql://admin:password@my-ha-db.abc123.us-east-1.rds.amazonaws.com:5432/myappdb',
    pool_size=10,
    max_overflow=20,
    pool_timeout=5,
    pool_recycle=1800,        # Recycle connections every 30 minutes
    pool_pre_ping=True,       # Test connections before use
    connect_args={
        'connect_timeout': 5,
        'options': '-c statement_timeout=30000'
    }
)
```

The `pool_pre_ping=True` setting is crucial. It sends a test query before each connection is used. If the connection is dead (from failover), it's discarded and a new one is created.

## Failover Duration Factors

Several factors affect how long failover takes:

- **Database size**: Larger databases with more uncommitted transactions take longer
- **Crash recovery**: If the primary failed mid-transaction, the standby needs to run crash recovery
- **Instance class**: Larger instances recover faster
- **Workload**: Heavy write workloads mean more data to recover

To minimize failover time:
1. Keep transactions short
2. Don't use long-running transactions
3. Use appropriate instance sizes
4. Consider Multi-AZ Cluster for faster failover (~35 seconds vs ~120 seconds)

## Testing Failover

You should regularly test failover to verify your application handles it correctly.

This script triggers failover and measures the duration by attempting connections.

```python
import boto3
import time
import psycopg2

rds = boto3.client('rds')

# Record start time
start = time.time()

# Trigger failover
rds.reboot_db_instance(
    DBInstanceIdentifier='my-ha-db',
    ForceFailover=True
)

# Monitor reconnection
while True:
    try:
        conn = psycopg2.connect(
            host='my-ha-db.abc123.us-east-1.rds.amazonaws.com',
            port=5432,
            database='myappdb',
            user='admin',
            password='password',
            connect_timeout=3
        )
        conn.cursor().execute('SELECT 1')
        conn.close()
        break
    except Exception:
        pass
    time.sleep(1)

elapsed = time.time() - start
print(f"Failover completed in {elapsed:.0f} seconds")
```

Run this during a maintenance window and track the results. Consistent failover times give you confidence in your recovery time objective (RTO).

## Failover and Read Replicas

If you have read replicas alongside Multi-AZ, here's what happens during failover:

- Read replicas continue to replicate from the new primary automatically
- There may be a brief interruption in replication
- Replica lag might spike temporarily after failover

Read replicas are NOT promoted during failover. They're a separate feature for read scaling, not high availability. For more on read replicas, check out [creating RDS read replicas](https://oneuptime.com/blog/post/create-rds-read-replicas-read-scaling/view).

## Setting Up Alerting

Set up comprehensive monitoring so you know when failovers happen and how your application responds. Tools like [OneUptime](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) can combine infrastructure metrics with application health checks to give you the full picture during a failover event.

## Wrapping Up

RDS Multi-AZ failover is a well-engineered process, but it's not invisible to your application. You'll have 60-120 seconds of database unavailability during which connections fail. The difference between a smooth failover and a mess is how your application handles those failed connections. Implement retry logic, avoid DNS caching, validate pooled connections, and test failover regularly. Do these things and your users probably won't even notice when a failover happens.

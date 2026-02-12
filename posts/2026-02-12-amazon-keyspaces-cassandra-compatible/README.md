# How to Set Up Amazon Keyspaces (Cassandra-Compatible)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Keyspaces, Cassandra, Database, NoSQL

Description: A hands-on guide to setting up Amazon Keyspaces, the serverless Cassandra-compatible database service, covering table creation, connectivity, and production best practices.

---

If you've ever managed an Apache Cassandra cluster, you know it's powerful but operationally demanding. Compaction tuning, gossip protocol issues, tombstone management - it's a full-time job. Amazon Keyspaces gives you Cassandra compatibility without any of that operational burden. It's serverless, scales automatically, and you only pay for what you use.

The catch? It's not full Cassandra. There are some CQL features it doesn't support and some behavioral differences you need to know about. Let's walk through setup, connectivity, and what to watch out for.

## How Keyspaces Differs from Self-Managed Cassandra

Keyspaces supports Cassandra Query Language (CQL) and the Apache 2.0 open-source Cassandra driver protocol. Most of your existing CQL queries will work. However, there are differences.

Keyspaces doesn't support:
- Lightweight transactions (LWT) with `IF NOT EXISTS` on some operations
- User-defined types (UDTs)
- User-defined functions and aggregates
- Materialized views
- Secondary indexes (but it supports custom indexes)
- BATCH statements across multiple tables
- Tunable consistency - you get `LOCAL_QUORUM` for writes and `LOCAL_ONE` or `LOCAL_QUORUM` for reads

The big win is that you never worry about node management, replication factor, or capacity planning. Keyspaces handles all of that automatically.

## Creating a Keyspace and Table

You don't need to provision a cluster. Just create a keyspace and start adding tables.

Using the AWS CLI:

```bash
# Create a keyspace (equivalent to a Cassandra keyspace)
aws keyspaces create-keyspace \
  --keyspace-name my_application

# Wait for the keyspace to become active
aws keyspaces get-keyspace --keyspace-name my_application
```

Now create a table:

```bash
# Create a table with schema definition
aws keyspaces create-table \
  --keyspace-name my_application \
  --table-name users \
  --schema-definition '{
    "allColumns": [
      {"name": "user_id", "type": "uuid"},
      {"name": "email", "type": "text"},
      {"name": "name", "type": "text"},
      {"name": "created_at", "type": "timestamp"},
      {"name": "status", "type": "text"}
    ],
    "partitionKeys": [
      {"name": "user_id"}
    ],
    "clusteringKeys": []
  }' \
  --default-time-to-live 0
```

You can also create tables using CQL directly, which feels more natural if you're coming from Cassandra.

## Connecting with CQL

Keyspaces supports connections via the Cassandra driver using SigV4 authentication or service-specific credentials. Let's set up both.

### Option 1: Service-Specific Credentials

Create credentials in IAM.

```bash
# Create service-specific credentials for Keyspaces
aws iam create-service-specific-credential \
  --user-name your-iam-user \
  --service-name cassandra.amazonaws.com
```

This gives you a username and password that work with standard Cassandra drivers.

### Option 2: SigV4 Authentication Plugin

This is the recommended approach for production since it uses your IAM credentials.

First, download the Starfield certificate that Keyspaces requires for TLS.

```bash
# Download the TLS certificate required for Keyspaces connections
curl https://certs.secureserver.net/repository/sf-class2-root.crt -O
```

Here's how to connect from Python using the SigV4 plugin.

```python
# Install dependencies: pip install cassandra-driver cassandra-sigv4
from cassandra.cluster import Cluster
from ssl import SSLContext, PROTOCOL_TLSv1_2, CERT_REQUIRED
from cassandra_sigv4.auth import SigV4AuthProvider
import boto3

# Set up TLS - Keyspaces requires encrypted connections
ssl_context = SSLContext(PROTOCOL_TLSv1_2)
ssl_context.load_verify_locations('sf-class2-root.crt')
ssl_context.verify_mode = CERT_REQUIRED

# Use SigV4 authentication with your AWS credentials
boto_session = boto3.Session(region_name='us-east-1')
auth_provider = SigV4AuthProvider(boto_session)

# Connect to the Keyspaces endpoint
cluster = Cluster(
    ['cassandra.us-east-1.amazonaws.com'],
    ssl_context=ssl_context,
    auth_provider=auth_provider,
    port=9142
)

session = cluster.connect()
print("Connected to Amazon Keyspaces")
```

For Java applications, which are common in the Cassandra ecosystem:

```java
// Java connection to Keyspaces using SigV4 auth
import software.aws.mcs.auth.SigV4AuthProvider;
import com.datastax.oss.driver.api.core.CqlSession;

import javax.net.ssl.SSLContext;
import java.net.InetSocketAddress;

public class KeyspacesConnection {
    public static CqlSession connect() {
        // Build the session with SigV4 auth and TLS
        return CqlSession.builder()
            .addContactPoint(new InetSocketAddress(
                "cassandra.us-east-1.amazonaws.com", 9142))
            .withLocalDatacenter("us-east-1")
            .withAuthProvider(new SigV4AuthProvider("us-east-1"))
            .withSslContext(SSLContext.getDefault())
            .build();
    }
}
```

## Working with Data Using CQL

Once connected, you can use standard CQL statements.

```python
# Create a keyspace using CQL
session.execute("""
    CREATE KEYSPACE IF NOT EXISTS my_application
    WITH REPLICATION = {'class': 'SingleRegionStrategy'}
""")

session.set_keyspace('my_application')

# Create a table for storing events with time-series partitioning
session.execute("""
    CREATE TABLE IF NOT EXISTS events (
        device_id text,
        event_date date,
        event_time timestamp,
        event_type text,
        payload text,
        PRIMARY KEY ((device_id, event_date), event_time)
    ) WITH CLUSTERING ORDER BY (event_time DESC)
""")

# Insert data
from datetime import datetime, date
from cassandra.query import SimpleStatement

session.execute(
    "INSERT INTO events (device_id, event_date, event_time, event_type, payload) VALUES (%s, %s, %s, %s, %s)",
    ('device-001', date.today(), datetime.now(), 'temperature', '{"value": 72.5}')
)

# Query recent events for a device
rows = session.execute(
    "SELECT * FROM events WHERE device_id = %s AND event_date = %s LIMIT 10",
    ('device-001', date.today())
)

for row in rows:
    print(f"{row.event_time}: {row.event_type} - {row.payload}")
```

## Capacity Modes

Keyspaces offers two capacity modes.

**On-demand mode** scales automatically and charges per read/write. Great for unpredictable workloads.

**Provisioned mode** lets you set read and write capacity units. Cheaper for predictable workloads, and supports auto-scaling.

```bash
# Create a table with provisioned throughput
aws keyspaces create-table \
  --keyspace-name my_application \
  --table-name high_volume_events \
  --schema-definition '{
    "allColumns": [
      {"name": "partition_key", "type": "text"},
      {"name": "sort_key", "type": "timestamp"},
      {"name": "data", "type": "text"}
    ],
    "partitionKeys": [{"name": "partition_key"}],
    "clusteringKeys": [{"name": "sort_key", "order": "DESC"}]
  }' \
  --capacity-specification '{
    "throughputMode": "PROVISIONED",
    "readCapacityUnits": 1000,
    "writeCapacityUnits": 500
  }'
```

## Setting Up Point-in-Time Recovery

Keyspaces supports point-in-time recovery (PITR), which lets you restore your table to any point within the last 35 days.

```bash
# Enable PITR on a table
aws keyspaces update-table \
  --keyspace-name my_application \
  --table-name users \
  --point-in-time-recovery '{"status": "ENABLED"}'
```

To restore a table to a specific point in time:

```bash
# Restore table to a specific timestamp
aws keyspaces restore-table \
  --source-keyspace-name my_application \
  --source-table-name users \
  --target-keyspace-name my_application \
  --target-table-name users_restored \
  --restore-timestamp 2026-02-10T15:30:00Z
```

## Monitoring Keyspaces

Keyspaces publishes metrics to CloudWatch under the `AWS/Cassandra` namespace.

```bash
# Set up an alarm for throttled requests
aws cloudwatch put-metric-alarm \
  --alarm-name keyspaces-throttling \
  --metric-name ThrottledRequests \
  --namespace AWS/Cassandra \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --dimensions Name=Keyspace,Value=my_application Name=TableName,Value=events \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

Key metrics to watch: `SuccessfulRequestCount`, `ThrottledRequests`, `SystemErrors`, `ConsumedReadCapacityUnits`, and `ConsumedWriteCapacityUnits`.

## Data Modeling Tips

Keyspaces follows the same data modeling principles as Cassandra. Design your tables around your query patterns, not around entity relationships.

Keep partition sizes under 1 GB for best performance. If you're storing time-series data, include a date component in the partition key to bound partition growth.

Avoid large IN clauses - they cause multiple partition reads behind the scenes. Instead, issue individual queries and let the driver handle parallelism.

## Wrapping Up

Amazon Keyspaces removes the operational complexity of running Cassandra while keeping the CQL interface your team already knows. The setup is dramatically simpler than provisioning a Cassandra cluster, but you need to be aware of the feature gaps. Test your application against Keyspaces before committing, particularly if you use lightweight transactions, UDTs, or materialized views.

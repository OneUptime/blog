# How to Migrate a Cassandra Database to Azure Cosmos DB Cassandra API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Cassandra, Database Migration, CQL, NoSQL

Description: A step-by-step guide to migrating your Apache Cassandra database to Azure Cosmos DB Cassandra API with schema mapping, data transfer, and validation.

---

If you are running Apache Cassandra and want to move to a fully managed service without rewriting your application, Azure Cosmos DB Cassandra API is a solid option. It supports CQL (Cassandra Query Language), uses the same partition key concepts, and works with existing Cassandra drivers. The migration involves creating the target schema, transferring data, validating consistency, and switching your application's connection. Let me walk through each step.

## Why Migrate to Cosmos DB Cassandra API?

Running Cassandra yourself means managing clusters, handling node failures, planning capacity, tuning compaction, and dealing with all the operational complexity that comes with a distributed database. Cosmos DB Cassandra API gives you:

- Fully managed infrastructure with no node management
- Guaranteed SLAs for availability and latency
- Automatic scaling with autoscale throughput
- Global distribution with turnkey replication
- Integrated backup and restore
- Azure security features (VNet, private endpoints, encryption)

The tradeoff is that not every Cassandra feature is supported, and the pricing model is different (RU-based instead of hardware-based). But for most workloads, the operational simplicity is worth it.

## Step 1: Assess Your Current Cassandra Environment

Before migrating, catalog what you have:

```bash
# Connect to your existing Cassandra cluster with cqlsh
cqlsh my-cassandra-host 9042

# List all keyspaces
DESCRIBE KEYSPACES;

# Get detailed schema for a specific keyspace
DESCRIBE KEYSPACE my_keyspace;

# Check table sizes and row counts
nodetool tablestats my_keyspace;
```

Document the following:

- All keyspaces and tables
- Partition keys and clustering columns
- Secondary indexes
- Materialized views (not supported in Cosmos DB - need alternative)
- User-defined types (UDTs)
- Custom data types or functions
- Table sizes and row counts
- Read/write throughput patterns

## Step 2: Create the Cosmos DB Cassandra API Account

```bash
# Create a Cosmos DB account with Cassandra API
az cosmosdb create \
    --name myCassandraAccount \
    --resource-group myResourceGroup \
    --capabilities EnableCassandra \
    --locations regionName=eastus failoverPriority=0 \
    --default-consistency-level Session
```

Get the connection details:

```bash
# Get the Cassandra endpoint and keys
az cosmosdb keys list \
    --name myCassandraAccount \
    --resource-group myResourceGroup

# The contact point is: myCassandraAccount.cassandra.cosmos.azure.com
# Port: 10350 (not the standard Cassandra 9042)
```

## Step 3: Create the Target Schema

Create keyspaces and tables on Cosmos DB. The schema needs some adjustments compared to standard Cassandra:

```sql
-- Create a keyspace in Cosmos DB Cassandra API
-- The WITH REPLICATION clause is required but the values are managed by Cosmos DB
CREATE KEYSPACE IF NOT EXISTS my_keyspace
    WITH REPLICATION = { 'class': 'NetworkTopologyStrategy', 'datacenter1': 1 };

USE my_keyspace;

-- Create tables with the same schema as your source
-- Important: Cosmos DB maps the partition key to its internal partition key
CREATE TABLE IF NOT EXISTS users (
    user_id UUID,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP,
    profile MAP<TEXT, TEXT>,
    PRIMARY KEY (user_id)
) WITH cosmosdb_provisioned_throughput = 4000;

-- Table with clustering columns
CREATE TABLE IF NOT EXISTS user_events (
    user_id UUID,
    event_time TIMESTAMP,
    event_type TEXT,
    event_data TEXT,
    PRIMARY KEY (user_id, event_time)
) WITH CLUSTERING ORDER BY (event_time DESC)
  AND cosmosdb_provisioned_throughput = 10000;

-- Table with composite partition key
CREATE TABLE IF NOT EXISTS sensor_readings (
    device_id TEXT,
    reading_date DATE,
    reading_time TIMESTAMP,
    value DOUBLE,
    unit TEXT,
    PRIMARY KEY ((device_id, reading_date), reading_time)
) WITH CLUSTERING ORDER BY (reading_time DESC)
  AND cosmosdb_provisioned_throughput = 8000;
```

Note the `cosmosdb_provisioned_throughput` extension - this sets the RU/s for each table. You can also use autoscale:

```sql
-- Create a table with autoscale throughput
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID,
    customer_id TEXT,
    order_date TIMESTAMP,
    total DECIMAL,
    status TEXT,
    PRIMARY KEY (customer_id, order_date)
) WITH cosmosdb_autoscale_max_throughput = 10000;
```

## Step 4: Choose a Migration Method

There are several tools for migrating data:

### Option A: Azure Cosmos DB Live Data Migrator

The simplest approach for online migration. It reads from your source Cassandra cluster and writes to Cosmos DB in real-time.

### Option B: Spark with the Cassandra Connector

For large datasets, Apache Spark provides parallel data transfer:

```python
# PySpark script to migrate data from Cassandra to Cosmos DB
# Run this on an Azure Databricks cluster or any Spark cluster
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("CassandraMigration") \
    .config("spark.cassandra.connection.host", "my-cassandra-host") \
    .config("spark.cassandra.connection.port", "9042") \
    .getOrCreate()

# Read from source Cassandra
source_df = spark.read \
    .format("org.apache.spark.sql.cassandra") \
    .options(table="users", keyspace="my_keyspace") \
    .load()

print(f"Total rows to migrate: {source_df.count()}")

# Write to Cosmos DB Cassandra API
# Configure the Cosmos DB connection
cosmos_config = {
    "spark.cassandra.connection.host": "myCassandraAccount.cassandra.cosmos.azure.com",
    "spark.cassandra.connection.port": "10350",
    "spark.cassandra.connection.ssl.enabled": "true",
    "spark.cassandra.auth.username": "myCassandraAccount",
    "spark.cassandra.auth.password": "YOUR_PRIMARY_KEY",
    "spark.cassandra.output.batch.size.rows": "1",
    "spark.cassandra.output.concurrent.writes": "100",
    "spark.cassandra.connection.connections_per_executor_max": "10",
    "spark.cassandra.output.batch.grouping.buffer.size": "1000"
}

# Write data to Cosmos DB
source_df.write \
    .format("org.apache.spark.sql.cassandra") \
    .options(table="users", keyspace="my_keyspace", **cosmos_config) \
    .mode("append") \
    .save()

print("Migration complete!")
```

### Option C: cqlsh COPY

For smaller tables, the cqlsh COPY command works:

```bash
# Export from source Cassandra to CSV
cqlsh my-cassandra-host 9042 -e \
    "COPY my_keyspace.users TO '/tmp/users.csv' WITH HEADER = TRUE;"

# Import into Cosmos DB Cassandra API
# Use SSL and the Cosmos DB port
cqlsh myCassandraAccount.cassandra.cosmos.azure.com 10350 \
    --ssl \
    -u myCassandraAccount \
    -p YOUR_PRIMARY_KEY \
    -e "COPY my_keyspace.users FROM '/tmp/users.csv' WITH HEADER = TRUE AND CHUNKSIZE=100;"
```

### Option D: Azure Database Migration Service

DMS provides a managed migration experience with monitoring and retry capabilities:

1. Create a DMS instance in the Azure Portal
2. Create a new migration project with Cassandra as the source and Cosmos DB Cassandra API as the target
3. Configure source and target connections
4. Select keyspaces and tables
5. Run the migration and monitor progress

## Step 5: Validate the Migration

After data transfer, verify that everything arrived correctly:

```python
# Python validation script using the Cassandra driver
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from ssl import SSLContext, PROTOCOL_TLS_CLIENT, CERT_REQUIRED

# Connect to source Cassandra
source_cluster = Cluster(['my-cassandra-host'], port=9042)
source_session = source_cluster.connect('my_keyspace')

# Connect to Cosmos DB Cassandra API
ssl_context = SSLContext(PROTOCOL_TLS_CLIENT)
ssl_context.check_hostname = False
ssl_context.verify_mode = CERT_REQUIRED

auth_provider = PlainTextAuthProvider(
    username='myCassandraAccount',
    password='YOUR_PRIMARY_KEY'
)

target_cluster = Cluster(
    ['myCassandraAccount.cassandra.cosmos.azure.com'],
    port=10350,
    auth_provider=auth_provider,
    ssl_context=ssl_context
)
target_session = target_cluster.connect('my_keyspace')

# Compare row counts for each table
tables = ['users', 'user_events', 'sensor_readings', 'orders']
for table in tables:
    source_count = source_session.execute(f"SELECT COUNT(*) FROM {table}").one()[0]
    target_count = target_session.execute(f"SELECT COUNT(*) FROM {table}").one()[0]
    status = "OK" if source_count == target_count else "MISMATCH"
    print(f"{table}: Source={source_count}, Target={target_count} [{status}]")

# Spot check some records
sample_users = source_session.execute("SELECT * FROM users LIMIT 10")
for user in sample_users:
    target_user = target_session.execute(
        "SELECT * FROM users WHERE user_id = %s", [user.user_id]
    ).one()
    if target_user:
        print(f"User {user.user_id}: Verified")
    else:
        print(f"User {user.user_id}: MISSING in target!")
```

## Step 6: Update Application Connection

Update your application to point to Cosmos DB:

```yaml
# Application configuration - before migration
cassandra:
  contact-points: my-cassandra-host
  port: 9042
  keyspace: my_keyspace

# Application configuration - after migration
cassandra:
  contact-points: myCassandraAccount.cassandra.cosmos.azure.com
  port: 10350
  keyspace: my_keyspace
  username: myCassandraAccount
  password: ${COSMOS_KEY}
  ssl: true
```

## Known Limitations

Be aware of these differences between Apache Cassandra and Cosmos DB Cassandra API:

1. **Materialized views**: Not supported. Use separate tables with denormalized data instead.
2. **Lightweight transactions (LWT)**: Limited support. IF NOT EXISTS works, but IF conditions on non-key columns may not.
3. **Secondary indexes**: Supported but implemented differently. Performance characteristics differ from native Cassandra.
4. **Batch statements**: Only single-partition batches are atomic. Multi-partition batches are not transactional.
5. **TTL**: Supported at both row and table level.
6. **User-defined functions**: Not supported. Move this logic to your application layer.
7. **Custom compaction strategies**: Not applicable - Cosmos DB manages storage internally.

## Throughput Considerations

Map your current Cassandra throughput to Cosmos DB RU/s. A rough starting point:

- A single Cassandra read of a 1 KB document costs approximately 1 RU
- A single write of a 1 KB document costs approximately 5 RU
- Larger documents cost proportionally more

Monitor your RU consumption after migration and adjust throughput accordingly. Start with autoscale to let the system find the right level, then switch to manual provisioned throughput once you understand the pattern.

Migrating from Cassandra to Cosmos DB Cassandra API removes the operational burden of managing clusters while maintaining CQL compatibility. The migration itself is mechanical - create schema, move data, validate, switch connection. The real work is understanding the limitations and adjusting your application for Cosmos DB's pricing model and feature differences.

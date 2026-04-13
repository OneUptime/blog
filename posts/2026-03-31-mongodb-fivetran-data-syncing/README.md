# How to Use MongoDB with Fivetran for Data Syncing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Fivetran, ELT, Data Sync, Connector

Description: Learn how to configure the Fivetran MongoDB connector to replicate collections to your data warehouse using change data capture.

---

## Why Use Fivetran with MongoDB?

Fivetran is a managed ELT service that handles connector maintenance, schema migration, and incremental replication automatically. The MongoDB connector uses change data capture (CDC) via the oplog to keep your data warehouse in sync with minimal latency and without manual cursor management.

## Prerequisites

- MongoDB running as a replica set (Atlas qualifies)
- Fivetran account with a destination configured (Snowflake, BigQuery, Redshift, etc.)
- A MongoDB user with the required roles

## Creating the Fivetran MongoDB User

```javascript
use admin
db.createUser({
  user: "fivetran",
  pwd: "FivetranSecure123!",
  roles: [
    { role: "read", db: "myDatabase" },
    { role: "read", db: "local" },
    { role: "clusterMonitor", db: "admin" }
  ]
})
```

The `local` database access is required for oplog reading. `clusterMonitor` allows Fivetran to inspect replica set state.

## Configuring the Fivetran Connector

1. Log in to Fivetran and click Add Connector
2. Search for and select MongoDB
3. Fill in the connector settings:

```text
Connector Name:    mongodb_prod
Host:              cluster.mongodb.net
Port:              27017
User:              fivetran
Password:          FivetranSecure123!
Database:          myDatabase
Connection Method: MongoDB Atlas (for Atlas clusters)
```

For self-hosted replica sets:

```text
Connection Method: Replica Set
Replica Set Name:  rs0
Hosts:             host1:27017,host2:27017,host3:27017
```

## Schema and Collection Selection

After Fivetran connects, it discovers all collections in the database. You can include or exclude specific collections in the connector settings. Each collection maps to a table in your destination warehouse.

## How CDC Replication Works

Fivetran reads MongoDB's oplog to detect inserts, updates, and deletes in real time. The oplog is a capped collection in the `local` database that records every write operation on the replica set.

Fivetran translates oplog entries into destination upserts and deletes, keeping the warehouse table in sync with the source collection.

## Document Flattening

MongoDB documents are nested, but warehouse tables are flat. Fivetran handles this by:

- Flattening top-level fields to columns
- Storing nested objects as JSON strings in a single column
- Creating child tables for arrays (one row per array element)

For example, a document like:

```json
{
  "_id": "abc123",
  "name": "Widget A",
  "tags": ["sale", "featured"],
  "dimensions": { "width": 10, "height": 5 }
}
```

Becomes in the warehouse:

```sql
-- Main table: mongodb_prod.products
-- _id, name, dimensions (as JSON string)

-- Child table: mongodb_prod.products__tags
-- _id, index, value
```

## Handling Large Collections

For collections with millions of documents, Fivetran performs an initial historical sync using batch reads, then switches to CDC mode. This initial sync can take hours or days for very large collections.

To minimize impact on your MongoDB cluster, schedule the initial sync during off-peak hours.

## Monitoring Sync Status

Use the Fivetran dashboard to monitor:
- Last sync time
- Rows synced per collection
- Connector status and error messages

You can also query your destination's Fivetran metadata table:

```sql
SELECT
  schema_name,
  table_name,
  rows_synced,
  sync_time
FROM fivetran_log.log
WHERE connector_id = 'mongodb_prod'
ORDER BY sync_time DESC
LIMIT 20;
```

## Pausing and Resuming Sync

Pause the connector during maintenance windows or to manage Fivetran credits:

This is done through the Fivetran UI or API:

```bash
curl -X PATCH \
  "https://api.fivetran.com/v1/connectors/<connector_id>" \
  -H "Authorization: Basic <base64-encoded-api-key:api-secret>" \
  -H "Content-Type: application/json" \
  -d '{"paused": true}'
```

## Summary

Fivetran's MongoDB connector provides fully managed CDC-based replication to your data warehouse. Create a dedicated MongoDB user with oplog read access, configure the connector with your connection details, and Fivetran handles schema discovery, initial sync, and ongoing change capture automatically. Monitor sync health through the Fivetran dashboard and query the audit log for detailed metrics.

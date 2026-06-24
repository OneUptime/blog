# How to Use MongoDB with Stitch (Talend) for ETL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Talend, ETL, Data Integration, Stitch

Description: Learn how to configure Stitch (now part of Talend) to replicate MongoDB collections to your data warehouse using the MongoDB connector.

---

## What Is Stitch?

Stitch is a cloud-based ELT service originally acquired by Talend, now part of Qlik. It provides a MongoDB connector that replicates collection data to destinations like Snowflake, BigQuery, Redshift, and PostgreSQL. Stitch uses log-based replication (oplog) for low-latency incremental syncing.

## Prerequisites

- MongoDB running as a replica set (required for log-based replication)
- A Stitch account with a destination pipeline configured
- A MongoDB user with the appropriate roles

## Creating the Stitch MongoDB User

Stitch requires read access to the target database and the `local` database for oplog access:

```javascript
use admin
db.createUser({
  user: "stitch",
  pwd: "StitchSecure456!",
  roles: [
    { role: "readAnyDatabase", db: "admin" },
    { role: "read", db: "local" }
  ]
})
```

## Connecting MongoDB to Stitch

1. Log in to Stitch and click Add Integration
2. Select MongoDB from the integration list
3. Fill in the connection form:

```text
Integration Name:  MongoDB Production
Host:              your-mongo-host.example.com
Port:              27017
Username:          stitch
Password:          StitchSecure456!
Database:          myDatabase
```

For MongoDB Atlas, use the SRV connection format and enable SSL.

## Replication Method Selection

Stitch offers three replication methods for MongoDB:

**Log-Based Incremental (recommended):**
- Reads the oplog to capture all inserts, updates, and deletes
- Low latency and efficient
- Requires replica set or Atlas cluster

**Key-Based Incremental:**
- Uses a user-specified cursor field (like `updatedAt`) to detect new and changed records
- Works without oplog access but misses deletes
- Suitable for standalone MongoDB instances

**Full Table Replication:**
- Re-replicates the entire collection on each sync run
- Uses `_id` as the default replication key
- Useful when no reliable incremental cursor exists

Set the replication method in the integration settings:

```text
Replication Method: Log-based Incremental Replication
```

## Selecting Collections to Sync

After connecting, Stitch performs a structural analysis to list available collections. Toggle which collections to include. Each selected collection creates a table in your destination.

## Defining Replication Keys for Key-Based Mode

If using key-based replication, set the replication key per collection:

```text
Collection: orders
Replication Key: updatedAt
```

Stitch queries: `{ "updatedAt": { "$gte": <last_replicated_value> } }` on each sync run. Using `$gte` (greater than or equal) ensures no records are missed at the boundary, though it may result in some duplicate rows being re-replicated.

## Understanding Stitch's Data Model

Stitch flattens nested documents when loading into structured destinations. Nested objects become columns with underscore-separated names:

```json
{ "address": { "city": "Austin", "state": "TX" } }
```

Becomes:

```text
address__city | address__state
Austin        | TX
```

Arrays create subtables:

```text
orders__items table:
_sdc_source_key__id | _sdc_sequence | index | sku   | qty
order-123           | 1234567890    | 0     | SKU01 | 2
```

## Monitoring with Stitch Metadata

Stitch adds metadata columns to every replicated table:

```sql
SELECT
  _id,
  name,
  _sdc_received_at,
  _sdc_sequence,
  _sdc_table_version,
  _sdc_batched_at
FROM mydb.customers
ORDER BY _sdc_received_at DESC
LIMIT 10;
```

These columns let you track when each row was last replicated.

## Handling Schema Changes

When a new field appears in MongoDB documents, Stitch adds it as a new column in the destination table automatically. Old rows will have NULL for the new column. No manual schema migration is required.

## Summary

Stitch (Talend) provides managed MongoDB replication with minimal configuration. Create a dedicated read-only user with oplog access, select log-based incremental replication for full fidelity, and choose the collections to sync. Stitch handles schema evolution automatically and loads replicated data into your destination warehouse for analytics.

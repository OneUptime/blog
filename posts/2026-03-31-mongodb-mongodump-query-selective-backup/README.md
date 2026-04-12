# How to Use mongodump with --query for Selective Backups in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongodump, Backup, Query, Database

Description: Learn how to use mongodump's --query flag to export only specific documents, reducing backup size and speeding up targeted data exports.

---

`mongodump` backs up an entire database by default, but the `--query` flag lets you filter documents so you only export what you need. This is useful for partial migrations, archiving old records, or backing up a single tenant's data.

## Basic --query Syntax

The `--query` flag accepts an extended JSON string matching MongoDB query syntax. It requires `--collection` to be specified:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --query='{"status": "completed"}' \
  --out=/tmp/selective-backup
```

## Querying by Date Range

Back up only records from the last 30 days:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=events \
  --query='{"createdAt": {"$gte": {"$date": "2026-03-01T00:00:00Z"}}}' \
  --out=/tmp/events-march
```

For extended JSON format (required on some versions), use:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=events \
  --query='{"createdAt": {"$gte": {"$date": {"$numberLong": "1772323200000"}}}}' \
  --out=/tmp/events-backup
```

## Archiving with Compression

Combine `--query` with `--gzip` and `--archive` for a compact single-file backup:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --query='{"status": "completed", "total": {"$gt": 100}}' \
  --gzip \
  --archive=/tmp/completed-orders.gz
```

## Querying with ObjectId or Tenant Filters

For multi-tenant applications, back up a single tenant:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=users \
  --query='{"tenantId": "acme-corp"}' \
  --out=/tmp/acme-backup
```

Using an ObjectId in the query requires extended JSON:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=sessions \
  --query='{"userId": {"$oid": "64a1f2c3b4e5f6789abc1234"}}' \
  --out=/tmp/user-sessions
```

## Scripting Selective Backups

Wrap selective backups in a script for recurring use:

```bash
#!/bin/bash
# Archive completed orders older than 90 days

CUTOFF=$(date -d "90 days ago" +"%Y-%m-%dT00:00:00Z")
QUERY="{\"status\": \"completed\", \"createdAt\": {\"\$lt\": {\"\$date\": \"$CUTOFF\"}}}"

mongodump \
  --uri="mongodb://admin:password@localhost:27017" \
  --authenticationDatabase=admin \
  --db=myapp \
  --collection=orders \
  --query="$QUERY" \
  --gzip \
  --archive="/var/backups/orders-archive-$(date +%Y%m%d).gz"
```

## Restoring a Selective Backup

Restore the filtered dump back to a collection:

```bash
mongorestore \
  --uri="mongodb://localhost:27017" \
  --gzip \
  --archive=/tmp/completed-orders.gz \
  --nsFrom="myapp.orders" \
  --nsTo="archive_db.orders"
```

## Summary

The `--query` flag in mongodump enables targeted exports of specific documents, making backups more efficient for large collections. Combining it with `--gzip` and `--archive` produces compact, portable backup files suitable for archiving or selective data migrations.


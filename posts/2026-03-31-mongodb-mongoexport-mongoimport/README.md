# How to Use mongoexport and mongoimport for Data Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Tool, Migration, Data, Operation

Description: Learn how to use mongoexport and mongoimport to move MongoDB collection data as JSON or CSV for migrations, seeding, and cross-environment data transfers.

---

## Overview

`mongoexport` and `mongoimport` are command-line tools for exporting and importing MongoDB data in human-readable formats:

- `mongoexport` - exports a single collection to JSON or CSV
- `mongoimport` - imports JSON, CSV, or TSV files into a collection

Unlike `mongodump`/`mongorestore` which use BSON, these tools use text formats, making the output portable and easy to inspect or edit.

```mermaid
flowchart LR
    A["MongoDB Collection"] -- "mongoexport" --> B["JSON / CSV file"]
    B -- "mongoimport" --> C["Target Collection"]
```

## mongoexport

### Basic Syntax

```bash
mongoexport \
  --uri="mongodb://user:password@host:27017/dbname" \
  --collection=<collection> \
  --out=<output file> \
  [options]
```

### Common Options

| Option | Description |
|---|---|
| `--uri` | Connection string |
| `--db` | Database name |
| `--collection` | Collection to export |
| `--out` | Output file path (stdout if omitted) |
| `--type` | `json` (default) or `csv` |
| `--fields` | Comma-separated field list (required for CSV) |
| `--query` | JSON query to filter exported documents |
| `--sort` | JSON sort specification |
| `--limit` | Maximum number of documents |
| `--skip` | Number of documents to skip |
| `--pretty` | Pretty-print JSON output |
| `--noHeaderLine` | Omit header row in CSV |

### Examples

#### Export a full collection to JSON

```bash
mongoexport \
  --uri="mongodb://localhost:27017/shop" \
  --collection=products \
  --out=products.json
```

#### Export with a filter query

```bash
mongoexport \
  --uri="mongodb://localhost:27017/shop" \
  --collection=orders \
  --query='{"status": "shipped", "total": {"$gt": 100}}' \
  --out=shipped_orders.json
```

#### Export to CSV with specific fields

```bash
mongoexport \
  --uri="mongodb://localhost:27017/analytics" \
  --collection=events \
  --type=csv \
  --fields=userId,eventType,timestamp,value \
  --out=events.csv
```

#### Export with authentication

```bash
mongoexport \
  --uri="mongodb://admin:secret@mongo.example.com:27017/mydb?authSource=admin" \
  --collection=users \
  --out=users.json
```

#### Export from a replica set

```bash
mongoexport \
  --uri="mongodb://host1:27017,host2:27017/mydb?replicaSet=rs0" \
  --collection=logs \
  --out=logs.json
```

## mongoimport

### Basic Syntax

```bash
mongoimport \
  --uri="mongodb://user:password@host:27017/dbname" \
  --collection=<collection> \
  --file=<input file> \
  [options]
```

### Common Options

| Option | Description |
|---|---|
| `--uri` | Connection string |
| `--db` | Database name |
| `--collection` | Target collection |
| `--file` | Input file path (stdin if omitted) |
| `--type` | `json` (default), `csv`, or `tsv` |
| `--headerline` | Use first line as field names (CSV/TSV) |
| `--fields` | Field names when no header line |
| `--mode` | `insert` (default), `upsert`, or `merge` |
| `--upsertFields` | Fields to match for upsert/merge |
| `--drop` | Drop collection before importing |
| `--ignoreBlanks` | Ignore blank fields in CSV/TSV |
| `--stopOnError` | Stop on first import error |
| `--numInsertionWorkers` | Parallel insertion workers (default 1) |

### Examples

#### Import a JSON file

```bash
mongoimport \
  --uri="mongodb://localhost:27017/shop" \
  --collection=products \
  --file=products.json
```

#### Import and drop existing collection first

```bash
mongoimport \
  --uri="mongodb://localhost:27017/shop" \
  --collection=products \
  --drop \
  --file=products.json
```

#### Import a CSV file with a header row

```bash
mongoimport \
  --uri="mongodb://localhost:27017/analytics" \
  --collection=events \
  --type=csv \
  --headerline \
  --file=events.csv
```

#### Import with upsert to update existing documents

```bash
mongoimport \
  --uri="mongodb://localhost:27017/shop" \
  --collection=products \
  --mode=upsert \
  --upsertFields=sku \
  --file=products_updated.json
```

#### Import with merge mode (update matching fields only)

```bash
mongoimport \
  --uri="mongodb://localhost:27017/users" \
  --collection=profiles \
  --mode=merge \
  --upsertFields=email \
  --file=profile_updates.json
```

#### Use parallel workers for large files

```bash
mongoimport \
  --uri="mongodb://localhost:27017/logs" \
  --collection=access_logs \
  --numInsertionWorkers=4 \
  --file=access_logs.json
```

## Cross-Environment Migration Workflow

```mermaid
flowchart TD
    A[Production DB] -- "mongoexport --query filter" --> B[filtered_data.json]
    B -- "transfer via scp / S3" --> C[Staging Server]
    C -- "mongoimport --mode upsert" --> D[Staging DB]
```

### Step-by-step migration

```bash
# 1. Export from production (orders since 2024-01-01)
mongoexport \
  --uri="mongodb://prod-host:27017/shop?authSource=admin" \
  --collection=orders \
  --query='{"createdAt": {"$gte": {"$date": "2024-01-01T00:00:00Z"}}}' \
  --out=recent_orders.json

# 2. Copy to target server
scp recent_orders.json staging-host:/tmp/

# 3. Import into staging
mongoimport \
  --uri="mongodb://staging-host:27017/shop" \
  --collection=orders \
  --mode=upsert \
  --upsertFields=_id \
  --file=/tmp/recent_orders.json
```

## mongodump vs. mongoexport

| Aspect | mongodump | mongoexport |
|---|---|---|
| Format | BSON (binary) | JSON or CSV (text) |
| Scope | Database or all databases | Single collection |
| BSON type fidelity | Full fidelity | Limited (JSON loses some types) |
| Use case | Full backups, restore | Data migration, inspection, seeding |
| Performance | Faster | Slower for large datasets |

## Summary

`mongoexport` and `mongoimport` are the right tools when you need human-readable data interchange between MongoDB environments or external systems. Export with `--query` to extract targeted subsets, and use `--mode=upsert` or `--mode=merge` during import to avoid overwriting unchanged documents. For full backups, prefer `mongodump`/`mongorestore` to preserve BSON type fidelity.

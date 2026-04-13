# How to Use mongoexport and mongoimport for JSON/CSV Backups in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoexport, Mongoimport, Backup

Description: Learn how to use mongoexport and mongoimport for exporting and importing MongoDB data in JSON and CSV formats for backups, migrations, and data sharing.

---

## Overview

`mongoexport` and `mongoimport` are command-line tools for exporting and importing MongoDB data in human-readable formats (JSON or CSV). Unlike `mongodump`/`mongorestore` which use binary BSON format, these tools produce text files that can be inspected, edited, and shared. They are ideal for data migrations, partial backups, and integrating MongoDB data with other systems.

## When to Use mongoexport vs mongodump

| Scenario | Use |
|----------|-----|
| Full database backup | mongodump |
| Human-readable export | mongoexport |
| Share data with non-MongoDB systems | mongoexport (CSV) |
| Migrate between databases | mongoexport + mongoimport |
| Preserve all indexes and metadata | mongodump |
| Export subset of documents | mongoexport |

## mongoexport Basics

```bash
# Export a collection to JSON
mongoexport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --out /tmp/orders.json

# Export to CSV format
mongoexport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --fields "orderId,customerId,status,total,createdAt"   --out /tmp/orders.csv
```

## Exporting with Filters

```bash
# Export only completed orders
mongoexport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --query '{"status": "completed"}'   --out /tmp/completed-orders.json

# Export with date filter
mongoexport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --query '{"createdAt": {"$gte": {"$date": "2026-01-01T00:00:00Z"}}}'   --out /tmp/orders-2026.json

# Export specific fields only
mongoexport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --fields "orderId,status,total"   --out /tmp/orders-summary.json
```

## Sorting and Limiting Exports

```bash
# Export the 1000 most recent orders
mongoexport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --sort '{"createdAt": -1}'   --limit 1000   --out /tmp/recent-orders.json
```

## mongoimport Basics

```bash
# Import JSON file
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --file /tmp/orders.json

# Import CSV file
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --headerline   --file /tmp/orders.csv
```

## Import Modes

```bash
# Insert mode (default) - fails on duplicate _id
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode insert   --file /tmp/orders.json

# Upsert mode - insert or update existing documents
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode upsert   --upsertFields "orderId"   --file /tmp/orders.json

# Merge mode - only update matching fields, keep others
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode merge   --upsertFields "orderId"   --file /tmp/orders-updates.json

# Delete mode - delete matching documents
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode delete   --upsertFields "orderId"   --file /tmp/orders-to-delete.json
```

## Handling CSV with Custom Delimiters

```bash
# Import tab-separated file
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type tsv   --headerline   --file /tmp/orders.tsv

# CSV with manually specified column names (no header row)
mongoimport --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --fields "orderId,customerId,status,total"   --file /tmp/orders-no-header.csv
```

## Exporting All Collections in a Database

```bash
#!/bin/bash
# export-all-collections.sh

DB="mydb"
MONGO_URI="mongodb://admin:secret@localhost:27017"
OUTPUT_DIR="/backup/exports/$(date +%Y%m%d)"
mkdir -p "${OUTPUT_DIR}"

# Get list of collections
COLLECTIONS=$(mongosh "${MONGO_URI}" --quiet --eval "db.getSiblingDB('${DB}').getCollectionNames().join('\n')")

for COLL in ${COLLECTIONS}; do
  echo "Exporting ${DB}.${COLL}..."
  mongoexport     --uri "${MONGO_URI}"     --db "${DB}"     --collection "${COLL}"     --out "${OUTPUT_DIR}/${COLL}.json"
done

echo "Export complete: ${OUTPUT_DIR}"
```

## Importing Multiple Files

```bash
#!/bin/bash
# import-all-collections.sh

DB="mydb"
MONGO_URI="mongodb://admin:secret@localhost:27017"
IMPORT_DIR="/backup/exports/20260331"

for JSON_FILE in "${IMPORT_DIR}"/*.json; do
  COLL=$(basename "${JSON_FILE}" .json)
  echo "Importing ${COLL}..."
  mongoimport     --uri "${MONGO_URI}"     --db "${DB}"     --collection "${COLL}"     --mode upsert     --file "${JSON_FILE}"
done
```

## Summary

`mongoexport` and `mongoimport` complement `mongodump`/`mongorestore` by providing human-readable JSON and CSV formats suitable for data inspection, migrations, and integration with other tools. The import modes (insert, upsert, merge, delete) give fine-grained control over how incoming data interacts with existing documents. For full database backups, prefer `mongodump`, but for selective exports, data sharing, and migrations between systems, `mongoexport` and `mongoimport` are the right choice.

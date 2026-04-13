# How to Use mongoimport to Import JSON Data into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoimport, JSON, Data Import

Description: Learn how to use mongoimport to load JSON data into MongoDB collections, including different import modes, error handling, and batch processing large files.

---

## Overview

`mongoimport` is a MongoDB Database Tools command that imports data from JSON, CSV, or TSV files into MongoDB collections. For JSON data, it supports both newline-delimited JSON (one document per line) and JSON arrays. It is the standard tool for loading data into MongoDB during migrations, seeding test data, or ingesting files from external systems.

## Installation

```bash
# Verify mongoimport is installed
mongoimport --version

# Install MongoDB Database Tools if needed
# Ubuntu/Debian:
sudo apt-get install mongodb-database-tools
```

## Basic JSON Import

```bash
# Import newline-delimited JSON (NDJSON) - one document per line
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --file /tmp/orders.json

# Import a JSON array file
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --jsonArray   --file /tmp/orders-array.json
```

## JSON File Formats Supported

**Newline-delimited JSON (default):**

```json
{"orderId":"ORD-001","status":"pending","total":99.99}
{"orderId":"ORD-002","status":"completed","total":49.99}
{"orderId":"ORD-003","status":"shipped","total":149.99}
```

**JSON array (use --jsonArray flag):**

```json
[
  {"orderId":"ORD-001","status":"pending","total":99.99},
  {"orderId":"ORD-002","status":"completed","total":49.99}
]
```

## Import Modes

```bash
# Insert mode (default) - errors on duplicate _id
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode insert   --file /tmp/orders.json

# Upsert mode - insert or update by matching fields
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode upsert   --upsertFields "orderId"   --file /tmp/orders.json

# Merge mode - update only the fields present in the file, leave others intact
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode merge   --upsertFields "orderId"   --file /tmp/order-updates.json

# Delete mode - delete documents matching the upsertFields
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --mode delete   --upsertFields "orderId"   --file /tmp/orders-to-delete.json
```

## Dropping the Collection Before Import

```bash
# Drop existing collection and import fresh
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --drop   --file /tmp/orders.json
```

## Handling Import Errors

```bash
# Stop on first error (by default mongoimport continues past errors)
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --stopOnError   --file /tmp/orders.json

# Continue on errors and report them
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --file /tmp/orders.json 2>&1 | tee /tmp/import-log.txt

# Check import results in the log
grep -E "imported|failed|error" /tmp/import-log.txt
```

## Importing with Type Coercion

For CSV or TSV imports, mongoimport can coerce field types using `--columnsHaveTypes`. This does not apply to JSON imports, where types are preserved from the JSON itself:

```bash
# Import CSV with field type specifications (--columnsHaveTypes is only valid for CSV/TSV)
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --columnsHaveTypes   --fields "orderId.string(),total.double(),createdAt.date(2006-01-02)"   --file /tmp/orders.csv   --type csv
```

## Importing Large Files in Batches

```bash
# Use --batchSize to control memory usage
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --batchSize 100   --file /tmp/large-orders.json

# For very large files, split them first
split -l 100000 /tmp/huge-orders.json /tmp/orders-chunk-

# Import each chunk
for chunk_file in /tmp/orders-chunk-*; do
  echo "Importing ${chunk_file}..."
  mongoimport     --uri "mongodb://admin:secret@localhost:27017"     --db mydb     --collection orders     --mode upsert     --upsertFields "orderId"     --file "${chunk_file}"
done
```

## Importing from stdin (Piping)

```bash
# Import directly from a compressed file
gzip -dc /backup/orders.json.gz | mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders

# Import filtered data from mongoexport
mongoexport   --uri "mongodb://source:27017"   --db mydb   --collection orders   --query '{"status": "completed"}' | mongoimport   --uri "mongodb://destination:27017"   --db mydb   --collection completed_orders
```

## Verifying Import Results

```javascript
// After importing, verify in mongosh
use mydb

// Check document count
db.orders.countDocuments()

// Check a sample of imported documents
db.orders.find().limit(5)

// Check for expected data types
let sample = db.orders.findOne();
print("total type:", typeof sample.total);    // should be 'number'
print("orderId type:", typeof sample.orderId); // should be 'string'

// Check for any documents with unexpected null values
db.orders.countDocuments({ total: null })
db.orders.countDocuments({ orderId: null })
```

## Full Import Script with Logging

```bash
#!/bin/bash
# import-orders.sh

MONGO_URI="mongodb://admin:secret@localhost:27017"
IMPORT_FILE="/tmp/orders.json"
DB="mydb"
COLLECTION="orders"
LOG_FILE="/var/log/mongodb-import-$(date +%Y%m%d-%H%M%S).log"

echo "Import started: $(date)" | tee "${LOG_FILE}"
echo "File: ${IMPORT_FILE}" | tee -a "${LOG_FILE}"
echo "Target: ${DB}.${COLLECTION}" | tee -a "${LOG_FILE}"

mongoimport   --uri "${MONGO_URI}"   --db "${DB}"   --collection "${COLLECTION}"   --mode upsert   --upsertFields "orderId"   --file "${IMPORT_FILE}" 2>&1 | tee -a "${LOG_FILE}"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Import SUCCESS: $(date)" | tee -a "${LOG_FILE}"
else
  echo "Import FAILED: $(date)" | tee -a "${LOG_FILE}"
  exit 1
fi
```

## Summary

`mongoimport` provides multiple modes for loading JSON data into MongoDB collections. Use `insert` mode for initial data loads, `upsert` mode for idempotent imports where you want to insert or update, and `merge` mode to update only the fields present in the file. The `--jsonArray` flag handles JSON array files, while the default mode handles newline-delimited JSON. For large datasets, control memory usage with `--batchSize` or split files before importing. Always verify document counts and data types after import to confirm the operation completed correctly.

# How to Use mongoimport for JSON Data Loading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoimport, JSON, Data Loading, Import

Description: Learn how to use mongoimport to load JSON files into MongoDB, including JSON arrays, BSON extended JSON, upsert modes, and error handling options.

---

## What Is mongoimport

`mongoimport` is a command-line tool in the MongoDB Database Tools package that imports JSON, CSV, or TSV data into a MongoDB collection. It supports both standard JSON and Extended JSON (BSON types like ObjectId, ISODate).

## Install MongoDB Database Tools

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-database-tools

# Ubuntu / Debian
sudo apt-get install mongodb-database-tools

# Red Hat / CentOS
sudo yum install mongodb-database-tools

# Verify installation
mongoimport --version
```

## Basic JSON Import

```bash
# Import a single-document-per-line (NDJSON / JSON Lines) file
# Default format is --type json with one document per line
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --file products.ndjson

# Example products.ndjson:
# {"sku":"WIDGET-1","name":"Blue Widget","price":9.99,"stock":100}
# {"sku":"GADGET-2","name":"Red Gadget","price":24.99,"stock":50}
```

## Import a JSON Array File

If the JSON file contains a top-level array instead of one document per line, use `--jsonArray`.

```bash
# products_array.json:
# [
#   {"sku":"WIDGET-1","name":"Blue Widget","price":9.99},
#   {"sku":"GADGET-2","name":"Red Gadget","price":24.99}
# ]

mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --jsonArray \
  --file products_array.json
```

## Import with Authentication and TLS (Atlas)

```bash
# mongodb+srv:// enables TLS by default, so no --tls flag is needed
mongoimport \
  --uri "mongodb+srv://user:pass@cluster0.atlas.mongodb.net/mydb" \
  --collection orders \
  --jsonArray \
  --file orders.json
```

## Drop Collection Before Import

```bash
# Replace the entire collection content (useful for full reloads)
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --drop \
  --jsonArray \
  --file products.json
```

## Upsert Mode: Insert or Update

```bash
# Upsert: insert if the document does not exist, update if it does
# --upsertFields specifies the match key
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --mode upsert \
  --upsertFields "sku" \
  --jsonArray \
  --file products.json

# merge mode: only updates fields present in the imported document
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --mode merge \
  --upsertFields "sku" \
  --jsonArray \
  --file product_updates.json
```

## Using Extended JSON for BSON Types

Standard JSON has no native types for ObjectId, ISODate, or NumberLong. Use Extended JSON (v2 format) to preserve BSON types.

```bash
# extended_orders.json (Extended JSON v2 format):
# {"_id":{"$oid":"64a1b2c3d4e5f60001020304"},
#  "customerId":{"$oid":"64a1b2c3d4e5f60001020305"},
#  "total":{"$numberDouble":"99.95"},
#  "createdAt":{"$date":{"$numberLong":"1743379200000"}}}

mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --file extended_orders.json

# mongoimport automatically detects Extended JSON v1 and v2 formats
```

## Import from stdin (Pipe)

```bash
# Pipe from another command (e.g., curl or a script)
curl -s https://api.example.com/export/products | mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --jsonArray

# Generate synthetic data and import
node generate_data.js | mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection test_events \
  --numInsertionWorkers 4
```

## Parallel Import with numInsertionWorkers

```bash
# Use multiple threads for faster imports of large files
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection events \
  --file large_events.json \
  --numInsertionWorkers 8
```

## Handling Import Errors

```bash
# Stop on first error (default when --stopOnError is set)
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --file products.json \
  --stopOnError

# Continue past errors (default behaviour without --stopOnError)
# mongoimport prints error count in the summary at the end
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --file products.json
# Output: 1234 document(s) imported, 3 document(s) failed to import
```

## Importing Partial Files (Skip and Limit)

`mongoimport` does not support `--skip` natively. To import a subset, pre-process the file:

```bash
# Import only the first 1000 lines of an NDJSON file
head -1000 large_events.ndjson | mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection events_sample

# Import lines 501 to 1000
sed -n '501,1000p' large_events.ndjson | mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection events_chunk
```

## Validating the Import

```javascript
// After import, verify the document count
db.products.countDocuments();

// Spot-check a few documents
db.products.findOne();
db.products.find().limit(5).pretty();

// Check for documents missing required fields
db.products.countDocuments({ sku: { $exists: false } });
```

## mongoimport vs. Driver insertMany Performance

| Method | Throughput | Use case |
|---|---|---|
| `mongoimport` | High (multi-threaded) | One-time or scheduled file loads |
| Driver `insertMany` | Flexible | Programmatic; custom transform logic |
| `mongoimport --mode upsert` | Medium | Idempotent reload |

## Summary

`mongoimport` loads JSON data into MongoDB from a file or stdin. Use `--jsonArray` for array-format files, `--mode upsert` with `--upsertFields` for idempotent imports, and Extended JSON format to preserve BSON types like ObjectId and ISODate. Increase `--numInsertionWorkers` for parallel loading of large files, and validate the import by checking document counts and spot-checking field values in the collection.

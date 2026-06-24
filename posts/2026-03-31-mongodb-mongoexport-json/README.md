# How to Use mongoexport for JSON Data Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoexport, JSON, Export, Data Pipeline

Description: Learn how to use mongoexport to export MongoDB collections to JSON files, including field selection, query filters, aggregation output, and Extended JSON types.

---

## What Is mongoexport

`mongoexport` is a command-line tool in the MongoDB Database Tools package that exports MongoDB collection data to JSON or CSV. It outputs one document per line (NDJSON / JSON Lines format) by default and supports Extended JSON to preserve BSON types.

## Basic JSON Export

```bash
# Export entire collection to NDJSON (one document per line)
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --out products.ndjson

# Each line in products.ndjson is a self-contained JSON document:
# {"_id":{"$oid":"64a1..."},"sku":"WIDGET-1","price":9.99}
# {"_id":{"$oid":"64a2..."},"sku":"GADGET-2","price":24.99}
```

## Export as a JSON Array

Use `--jsonArray` to wrap all documents in a top-level JSON array for compatibility with tools that expect a JSON array rather than NDJSON.

```bash
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --jsonArray \
  --out orders_array.json

# output: [{"_id":...},{"_id":...}, ...]
```

## Select Specific Fields

```bash
# Export only specific fields (projection)
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --fields "_id,name,email,createdAt" \
  --out customers_export.json

# Exclude _id by piping through jq (mongoexport always includes _id)
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --fields "name,email,createdAt" | jq 'del(._id)' > customers_no_id.json
```

## Export with a Query Filter

```bash
# Export only shipped orders from 2026
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --query '{"status":"shipped","createdAt":{"$gte":{"$date":"2026-01-01T00:00:00Z"}}}' \
  --out shipped_2026.json

# Export with sort and limit
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection events \
  --sort '{"ts":-1}' \
  --limit 10000 \
  --out recent_events.json
```

## Export from Atlas with TLS

```bash
mongoexport \
  --uri "mongodb+srv://user:pass@cluster0.atlas.mongodb.net/mydb" \
  --collection products \
  --fields "sku,name,price,stock" \
  --out products.json \
  --ssl
```

## Extended JSON: Preserving BSON Types

By default `mongoexport` outputs Extended JSON v2 (Relaxed) format, which uses human-readable representations for most BSON types while preserving type information for types without a JSON equivalent.

```bash
# Extended JSON v2 Relaxed (default) - human-readable numbers, typed ObjectId and Date
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --out orders_relaxed.json
# {"_id":{"$oid":"64a1..."},"total":99.95,"createdAt":{"$date":"2026-03-31T10:00:00Z"}}

# Extended JSON v2 Canonical - preserves full BSON type wrappers
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --jsonFormat=canonical \
  --out orders_canonical.json
# {"_id":{"$oid":"64a1..."},"total":{"$numberDouble":"99.95"},"createdAt":{"$date":{"$numberLong":"1774965600000"}}}
```

## Pretty-Print Output

```bash
# Human-readable indented JSON (useful for small exports / inspection)
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection config \
  --pretty \
  --out config.json
```

## Export to stdout (Pipe to Another Tool)

```bash
# Pipe to jq for transformation
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --fields "sku,name,price" | jq '.price = (.price * 1.1 * 100 | round | . / 100)' > products_uplifted.json

# Pipe to gzip for compressed export
mongoexport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection events | gzip > events.ndjson.gz

# Load immediately into another MongoDB instance
mongoexport \
  --uri "mongodb://source-host:27017/mydb" \
  --collection orders | mongoimport \
  --uri "mongodb://dest-host:27017/mydb" \
  --collection orders
```

## Exporting Time-Bounded Partitions

```bash
# Export one day at a time for large collections
for day in 01 02 03 04 05; do
  mongoexport \
    --uri "mongodb://localhost:27017/mydb" \
    --collection events \
    --query "{\"ts\":{\"\$gte\":{\"\$date\":\"2026-03-${day}T00:00:00Z\"},\"\$lt\":{\"\$date\":\"2026-03-$(printf '%02d' $((10#$day+1)))T00:00:00Z\"}}}" \
    --out "events_2026-03-${day}.json"
done
```

## Validate the Export

```bash
# Count lines in NDJSON (= number of exported documents)
wc -l products.ndjson

# Verify JSON syntax of the first document
head -1 products.ndjson | python3 -m json.tool

# Check file size
ls -lh products.ndjson
```

## Differences Between mongoexport and mongodump

| Feature | mongoexport | mongodump |
|---|---|---|
| Output format | JSON / CSV (human-readable) | BSON (binary, compact) |
| Restore tool | mongoimport | mongorestore |
| Use case | Data sharing, ETL, inspection | Full backup / restore |
| Preserves all BSON types | Via Extended JSON | Natively (binary) |
| Suitable for large backups | No (slow, large files) | Yes |
| Cross-version compatibility | High (JSON is universal) | Same MongoDB version preferred |

## Summary

`mongoexport` exports MongoDB collections to NDJSON or JSON array files. Use `--fields` to select columns, `--query` to filter documents, `--sort` and `--limit` to control output size, and `--jsonArray` for array-format output. Pipe the output to `mongoimport` for direct collection copying, to `gzip` for compression, or to `jq` for JSON transformation. For full backups prefer `mongodump`; use `mongoexport` when you need human-readable JSON for ETL pipelines or data sharing.

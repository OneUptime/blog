# How to Import Data from a JSON File into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Import, JSON, Mongoimport, Database

Description: Learn how to import JSON data into MongoDB using mongoimport and the MongoDB driver, including handling arrays, nested documents, and large files.

---

## Overview

MongoDB provides the `mongoimport` tool for importing JSON files directly from the command line. You can also load JSON programmatically using the MongoDB drivers. This guide covers both approaches with practical examples.

## Importing a JSON Array with mongoimport

If your file contains a JSON array of documents, use the `--jsonArray` flag:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --file products.json \
  --jsonArray
```

The file should look like:

```json
[
  { "name": "Widget A", "price": 9.99, "category": "tools" },
  { "name": "Widget B", "price": 14.99, "category": "tools" }
]
```

## Importing Newline-Delimited JSON (NDJSON)

If each line in the file is a separate JSON document (NDJSON format), omit `--jsonArray`:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection events \
  --file events.ndjson
```

NDJSON is the default format expected by `mongoimport` and is more memory-efficient for large files.

## Importing with Authentication

```bash
mongoimport \
  --uri "mongodb://admin:password@localhost:27017/mydb?authSource=admin" \
  --collection users \
  --file users.json \
  --jsonArray
```

## Using --upsert to Avoid Duplicates

To update existing documents instead of inserting duplicates, use `--mode=upsert` with a match field:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --file products.json \
  --jsonArray \
  --mode=upsert \
  --upsertFields "sku"
```

This updates any document whose `sku` matches and inserts new ones.

## Importing Programmatically with Node.js

```javascript
const { MongoClient } = require("mongodb");
const fs = require("fs");

async function importFromJSON(filePath, collectionName) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  const db = client.db("mydb");
  const collection = db.collection(collectionName);

  const raw = fs.readFileSync(filePath, "utf-8");
  const docs = JSON.parse(raw);

  const result = await collection.insertMany(docs, { ordered: false });
  console.log(`Inserted ${result.insertedCount} documents`);
  await client.close();
}

importFromJSON("products.json", "products");
```

## Handling Large Files

For files with millions of documents, stream the data instead of loading it all into memory:

```bash
# Split the file into smaller chunks first
split -l 10000 large_data.ndjson chunk_
# Then import each chunk
for f in chunk_*; do
  mongoimport --uri "mongodb://localhost:27017/mydb" --collection data --file "$f"
done
```

## Summary

Use `mongoimport` with `--jsonArray` for JSON arrays or without for NDJSON files. Add `--upsert` to avoid inserting duplicate documents. For large files, consider splitting them into chunks or streaming data programmatically with the MongoDB driver to avoid memory issues.

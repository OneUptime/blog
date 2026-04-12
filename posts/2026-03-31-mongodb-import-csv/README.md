# How to Import CSV Data into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSV, Import, Mongoimport, Data Loading

Description: Learn how to import CSV files into MongoDB using mongoimport, the Node.js driver, and Python PyMongo, including type coercion and upsert strategies.

---

## Overview

CSV files are the most common data exchange format. MongoDB provides `mongoimport` for command-line imports and the native drivers for programmatic ingestion with custom transformation logic.

```mermaid
flowchart LR
    CSV[CSV file] --> MI[mongoimport]
    CSV --> Node[Node.js csv-parse + driver]
    CSV --> Py[Python pandas + PyMongo]
    MI & Node & Py --> Mongo[(MongoDB Collection)]
```

## Method 1: mongoimport (Fastest for Simple Imports)

`mongoimport` is included with MongoDB Database Tools.

```bash
# Basic CSV import
# --type csv tells mongoimport the input format
# --headerline uses the first row as field names
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --type csv \
  --headerline \
  --file products.csv

# Import with authentication (Atlas)
mongoimport \
  --uri "mongodb+srv://user:pass@cluster0.atlas.mongodb.net/mydb" \
  --collection customers \
  --type csv \
  --headerline \
  --file customers.csv \
  --ssl

# Specify field names manually (when CSV has no header row)
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection sales \
  --type csv \
  --fields "orderId,customerId,amount,date,status" \
  --file sales_no_header.csv

# Upsert instead of insert (use orderId as the match key)
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --type csv \
  --headerline \
  --mode upsert \
  --upsertFields "orderId" \
  --file orders.csv

# Drop the collection before importing (full reload)
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --type csv \
  --headerline \
  --drop \
  --file products.csv
```

## mongoimport Type Coercion

Modern `mongoimport` (Database Tools 100.0+) automatically infers integers and doubles from CSV values, but dates and other complex types are still imported as strings. Use `--columnsHaveTypes` with the `--fields` option to specify exact types, especially for date fields.

```bash
# Specify types with columnsHaveTypes flag
# Syntax: fieldName.type(options)
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection sales \
  --type csv \
  --columnsHaveTypes \
  --fields "orderId.string(),amount.double(),qty.int32(),orderDate.date(2006-01-02)" \
  --file sales.csv
```

## Method 2: Node.js with csv-parse

For custom transformation and validation logic, parse the CSV in Node.js and write with the MongoDB driver.

```bash
npm install csv-parse mongodb
```

```javascript
const { MongoClient } = require("mongodb");
const { parse }       = require("csv-parse");
const fs              = require("fs");

const client = new MongoClient(process.env.MONGO_URI);

async function importCSV(filePath, dbName, collName) {
  await client.connect();
  const collection = client.db(dbName).collection(collName);

  const BATCH_SIZE = 1000;
  let batch = [];
  let totalInserted = 0;

  const parser = fs.createReadStream(filePath).pipe(
    parse({
      columns:          true,   // use first row as column names
      skip_empty_lines: true,
      trim:             true
    })
  );

  for await (const record of parser) {
    // Transform types: csv-parse returns everything as strings
    batch.push({
      orderId:    record.orderId,
      customerId: record.customerId,
      amount:     parseFloat(record.amount) || 0,
      qty:        parseInt(record.qty, 10) || 0,
      orderDate:  record.orderDate ? new Date(record.orderDate) : null,
      status:     record.status || "unknown"
    });

    if (batch.length >= BATCH_SIZE) {
      const result = await collection.insertMany(batch, { ordered: false });
      totalInserted += result.insertedCount;
      batch = [];
      process.stdout.write(`\rInserted: ${totalInserted}`);
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    const result = await collection.insertMany(batch, { ordered: false });
    totalInserted += result.insertedCount;
  }

  console.log(`\nImport complete. Total inserted: ${totalInserted}`);
  await client.close();
}

importCSV("./products.csv", "mydb", "products");
```

## Method 3: Upsert on Import (Avoid Duplicates)

```javascript
async function upsertFromCSV(filePath, dbName, collName, matchField) {
  await client.connect();
  const collection = client.db(dbName).collection(collName);

  const BATCH_SIZE = 500;
  let ops = [];
  let totalUpserted = 0;

  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, trim: true }));

  for await (const record of parser) {
    ops.push({
      updateOne: {
        filter: { [matchField]: record[matchField] },
        update: {
          $set: {
            ...record,
            amount: parseFloat(record.amount),
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        upsert: true
      }
    });

    if (ops.length >= BATCH_SIZE) {
      const result = await collection.bulkWrite(ops, { ordered: false });
      totalUpserted += result.upsertedCount + result.modifiedCount;
      ops = [];
    }
  }

  if (ops.length > 0) {
    const result = await collection.bulkWrite(ops, { ordered: false });
    totalUpserted += result.upsertedCount + result.modifiedCount;
  }

  console.log(`Upsert complete: ${totalUpserted} documents affected`);
  await client.close();
}

upsertFromCSV("./products.csv", "mydb", "products", "sku");
```

## Method 4: Python with pandas and PyMongo

```python
import pandas as pd
from pymongo import MongoClient
import os

client = MongoClient(os.environ["MONGO_URI"])
db = client["mydb"]
collection = db["products"]

# Read CSV with pandas for type inference
df = pd.read_csv("products.csv", dtype_backend="numpy_nullable")

# Convert date columns
df["orderDate"] = pd.to_datetime(df["orderDate"], errors="coerce")

# Convert to list of dicts and insert
records = df.where(pd.notna(df), None).to_dict(orient="records")

BATCH_SIZE = 1000
for i in range(0, len(records), BATCH_SIZE):
    batch = records[i:i + BATCH_SIZE]
    result = collection.insert_many(batch, ordered=False)
    print(f"Inserted {len(result.inserted_ids)} records (batch {i // BATCH_SIZE + 1})")

print(f"Total records: {len(records)}")
client.close()
```

## Handling Errors During Import

```javascript
async function safeImport(filePath, collection) {
  let inserted = 0, errors = 0;
  const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, trim: true }));

  for await (const record of parser) {
    try {
      await collection.insertOne({
        ...record,
        amount: parseFloat(record.amount),
        importedAt: new Date()
      });
      inserted++;
    } catch (err) {
      errors++;
      console.error(`Failed to insert row: ${JSON.stringify(record)}: ${err.message}`);
    }
  }

  console.log(`Done: ${inserted} inserted, ${errors} errors`);
}
```

## Summary

Import CSV data into MongoDB using `mongoimport --type csv --headerline` for simple file loads, or use Node.js with `csv-parse` for custom type coercion, validation, and upsert logic. Always parse numeric and date fields explicitly since CSV values are strings by default. Use `insertMany` with `ordered: false` for batch inserts, and `bulkWrite` with `updateOne` upsert operations when re-importing the same data should update existing records rather than create duplicates.

# How to Import Data from a CSV File into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Import, CSV, Mongoimport, Database

Description: Learn how to import CSV files into MongoDB using mongoimport, including type mapping, header handling, and upsert strategies for clean data loading.

---

## Overview

MongoDB's `mongoimport` tool supports CSV and TSV file formats in addition to JSON. Importing CSV data requires specifying column headers and optionally mapping field types to avoid treating numbers and booleans as strings.

## Basic CSV Import

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --type csv \
  --headerline \
  --file customers.csv
```

The `--headerline` flag tells `mongoimport` to use the first row as field names. A sample CSV might look like:

```text
id,name,email,age,active
1,Alice Smith,alice@example.com,30,true
2,Bob Jones,bob@example.com,25,false
```

## Specifying Fields Without a Header Row

If your CSV has no header row, specify the field names with `--fields`:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --type csv \
  --fields "id,name,email,age,active" \
  --file customers_no_header.csv
```

## Importing with Type Coercion

By default, all values are imported as strings. Use `--columnsHaveTypes` to specify types:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --type csv \
  --fields "id.int32(),name.string(),email.string(),age.int32(),active.boolean()" \
  --columnsHaveTypes \
  --file customers_no_header.csv
```

Supported types include `int32()`, `int64()`, `double()`, `boolean()`, `date()`, and `string()`.

## Upsert on a Unique Field

To avoid inserting duplicate rows when re-importing updated data:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection customers \
  --type csv \
  --headerline \
  --upsert \
  --upsertFields "id" \
  --file customers.csv
```

## Importing from a Tab-Separated File

For TSV files, change the type to `tsv`:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --type tsv \
  --headerline \
  --file orders.tsv
```

## Programmatic CSV Import with Python

```python
import csv
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["mydb"]
collection = db["customers"]

with open("customers.csv", newline="") as f:
    reader = csv.DictReader(f)
    docs = []
    for row in reader:
        docs.append({
            "id": int(row["id"]),
            "name": row["name"],
            "email": row["email"],
            "age": int(row["age"]),
            "active": row["active"].lower() == "true"
        })

result = collection.insert_many(docs)
print(f"Inserted {len(result.inserted_ids)} documents")
```

## Summary

Use `mongoimport` with `--type csv` and `--headerline` for straightforward CSV imports. Add `--columnsHaveTypes` to coerce numeric and boolean fields from their string representations. For programmatic imports with custom type handling, use the Python or Node.js driver to parse and transform rows before inserting.

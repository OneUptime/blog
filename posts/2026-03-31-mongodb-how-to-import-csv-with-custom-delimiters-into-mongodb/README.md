# How to Import CSV with Custom Delimiters into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoimport, CSV, Data Import, Custom Delimiter

Description: Learn how to import CSV files with custom delimiters, quoted fields, and type conversions into MongoDB using mongoimport and Python pandas.

---

## Introduction

MongoDB's `mongoimport` tool supports CSV and TSV import with header handling and field type mapping. Natively, `mongoimport` only supports comma (CSV) and tab (TSV) delimiters. For files with other separators like pipes or semicolons, you can preprocess the file before importing or use Python with pymongo for full control over parsing and conversion.

## Basic CSV Import

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection employees \
  --type csv \
  --headerline \
  --file employees.csv
```

`--headerline` uses the first row as field names.

## Custom Delimiter - Tab Separated (TSV)

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection data \
  --type tsv \
  --headerline \
  --file data.tsv
```

Use `--type tsv` for tab-delimited files.

## Custom Delimiter - Pipe-Delimited (Preprocessing)

`mongoimport` does not natively support custom delimiters beyond comma and tab. For pipe-delimited files, preprocess the file to convert it to CSV before importing:

```bash
# Convert pipe-delimited file to CSV
sed 's/|/,/g' products_pipe.csv > products.csv

mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --type csv \
  --headerline \
  --file products.csv
```

Example pipe-delimited source file:

```text
id|name|price|category
1|Widget A|9.99|Electronics
2|Widget B|14.99|Electronics
3|Gadget X|29.99|Tools
```

Note: If your field values contain commas, use the Python approach shown later in this post for safer parsing.

## Specifying Fields Manually (No Header Row)

If the CSV has no header line, specify fields explicitly:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection orders \
  --type csv \
  --fields "orderId,customerId,amount,status,createdAt" \
  --file orders_noheader.csv
```

## Importing with Field Type Annotations

Use `--columnsHaveTypes` to specify types inline in the header:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection sales \
  --type csv \
  --headerline \
  --columnsHaveTypes \
  --file sales_typed.csv
```

The header row with type annotations:

```text
orderId.int32(),customerId.string(),amount.double(),createdAt.date(2006-01-02)
1001,c001,99.99,2026-01-15
1002,c002,149.50,2026-01-16
```

Supported types: `auto()`, `binary(base32|base64|hex)`, `boolean()`, `date(format)`, `date_go(format)`, `date_ms(format)`, `date_oracle(format)`, `decimal()`, `double()`, `int32()`, `int64()`, `string()`.

## Ignoring Blank Fields

Skip empty fields during import:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection contacts \
  --type csv \
  --headerline \
  --ignoreBlanks \
  --file contacts.csv
```

## Python Import with Custom Delimiter

For more control, use Python's csv module with pymongo:

```python
import csv
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
collection = client["mydb"]["products"]

BATCH_SIZE = 500
batch = []

with open("products.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f, delimiter="|")
    for row in reader:
        # Convert types as needed
        doc = {
            "productId": int(row["id"]),
            "name": row["name"].strip(),
            "price": float(row["price"]),
            "category": row["category"].strip()
        }
        batch.append(doc)

        if len(batch) >= BATCH_SIZE:
            collection.insert_many(batch)
            batch = []
            print(f"Inserted batch...")

if batch:
    collection.insert_many(batch)

print("Import complete")
```

## Handling Quoted Fields with Embedded Delimiters

CSV files often quote fields that contain the delimiter. Python handles this automatically:

```python
import csv
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
collection = client["mydb"]["descriptions"]

with open("descriptions.csv", "r") as f:
    # quotechar and quoting handle "field, with, commas" cases
    reader = csv.DictReader(
        f,
        delimiter=",",
        quotechar='"',
        quoting=csv.QUOTE_MINIMAL
    )
    docs = list(reader)
    collection.insert_many(docs)
```

## Using pandas for Complex CSV Transformations

```python
import pandas as pd
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
collection = client["mydb"]["events"]

# Read with semicolon delimiter, parse dates automatically
df = pd.read_csv(
    "events.csv",
    sep=";",
    parse_dates=["event_date"],
    dtype={"user_id": str, "amount": float}
)

# Remove NaN values
df = df.dropna(subset=["user_id"])

# Convert to records and insert
records = df.to_dict("records")
collection.insert_many(records)
print(f"Imported {len(records)} records")
```

## Upsert Mode for Incremental CSV Loads

When importing updated data, use upsert to avoid duplicates:

```bash
mongoimport \
  --uri "mongodb://localhost:27017/mydb" \
  --collection products \
  --type csv \
  --headerline \
  --mode upsert \
  --upsertFields "productId" \
  --file updated_products.csv
```

## Summary

`mongoimport` handles CSV and TSV import natively with type conversions via `--columnsHaveTypes`. For tab-delimited files, use `--type tsv`. For files with other delimiters (pipes, semicolons), preprocess them to CSV or use Python with the `csv` module or pandas for full control over field parsing, type conversion, and batch sizes. Use upsert mode for incremental loads to update existing documents without creating duplicates.

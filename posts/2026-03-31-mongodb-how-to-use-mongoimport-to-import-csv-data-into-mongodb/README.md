# How to Use mongoimport to Import CSV Data into MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoimport, CSV, Data Import

Description: Learn how to use mongoimport to import CSV and TSV files into MongoDB, with field mapping, type coercion, header handling, and best practices for data migration.

---

## Overview

`mongoimport` can load CSV and TSV files directly into MongoDB collections. This is useful for migrating data from spreadsheets, relational databases, or other systems that export CSV. Because CSV is inherently typeless, mongoimport imports all values as strings by default, but you can use type hints to preserve numeric and date types.

## Basic CSV Import

```bash
# Import CSV with header row
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --headerline   --file /tmp/orders.csv
```

The `--headerline` flag tells mongoimport the first row contains column names, which become the MongoDB field names.

## CSV Without a Header Row

If your CSV has no header row, specify field names manually:

```bash
# Specify field names when CSV has no header
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --fields "orderId,customerId,status,total,createdAt"   --file /tmp/orders-no-header.csv
```

## Type Coercion for CSV Data

By default, CSV values are imported as strings. Use `--columnsHaveTypes` to preserve types:

```bash
# Import with type coercion
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --columnsHaveTypes   --fields "orderId.string(),customerId.string(),status.string(),total.double(),quantity.int32(),createdAt.date(2006-01-02T15:04:05Z07:00),isActive.boolean()"   --file /tmp/orders.csv
```

Available type specifiers:
- `.string()` - string value
- `.int32()` - 32-bit integer
- `.int64()` - 64-bit integer
- `.double()` - floating point number
- `.boolean()` - true/false
- `.date(format)` - date with Go time format string
- `.date_go(format)` - date with Go time format
- `.date_ms()` - milliseconds since epoch
- `.decimal()` - decimal128

## TSV (Tab-Separated Values) Import

```bash
# Import tab-separated file
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type tsv   --headerline   --file /tmp/orders.tsv
```

## Import Modes for CSV

```bash
# Insert mode - add new documents (fails on duplicate _id)
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection customers   --type csv   --headerline   --mode insert   --file /tmp/new-customers.csv

# Upsert mode - insert or update by matching field
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection customers   --type csv   --headerline   --mode upsert   --upsertFields "customerId"   --file /tmp/customers.csv

# Merge mode - update only the fields in the CSV
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection customers   --type csv   --headerline   --mode merge   --upsertFields "customerId"   --file /tmp/customer-emails.csv
```

## Handling Special Characters and Quoting

CSV files from Excel or other tools often have quoted fields and special characters. mongoimport handles standard CSV quoting:

```text
orderId,notes,total
ORD-001,"Contains, a comma",99.99
ORD-002,"Has ""quotes"" inside",49.99
ORD-003,"Multi
line note",149.99
```

```bash
# Standard import handles quoted fields correctly
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --headerline   --file /tmp/orders-with-special-chars.csv
```

## Preprocessing CSV Before Import

For CSV files with problematic formatting, preprocess with Python first:

```python
# preprocess-csv.py
import csv
import json
from datetime import datetime

input_file = '/tmp/raw-orders.csv'
output_file = '/tmp/cleaned-orders.json'

with open(input_file) as csvfile, open(output_file, 'w') as jsonfile:
    reader = csv.DictReader(csvfile)
    
    for row in reader:
        # Clean and type-convert fields
        doc = {
            'orderId': row['order_id'].strip(),
            'customerId': row['customer_id'].strip(),
            'status': row['status'].lower().strip(),
            'total': float(row['total'].replace('$', '').replace(',', '')),
            'quantity': int(row['qty']),
            'createdAt': datetime.strptime(row['date'], '%m/%d/%Y').isoformat() + 'Z'
        }
        jsonfile.write(json.dumps(doc) + '\n')

print("Preprocessing complete, importing...")
```

```bash
# Run preprocessing then import
python3 preprocess-csv.py
mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --file /tmp/cleaned-orders.json
```

## Skipping the Header Row

```bash
# Import starting from line 2 (skip header)
# First manually strip the header
tail -n +2 /tmp/orders.csv | mongoimport   --uri "mongodb://admin:secret@localhost:27017"   --db mydb   --collection orders   --type csv   --fields "orderId,customerId,status,total"   --file /dev/stdin
```

## Verifying CSV Import Results

```javascript
// After import, verify in mongosh
use mydb

// Count imported documents
db.orders.countDocuments()

// Check data types of imported fields
let sample = db.orders.findOne();
print("total type:", typeof sample.total);  // 'string' unless columnsHaveTypes was used
print("orderId:", sample.orderId);

// Find any documents where total is not a number
// (indicates type coercion didn't work as expected)
db.orders.countDocuments({ total: { $type: "string" } })

// Check for empty/null required fields
db.orders.countDocuments({ $or: [{ orderId: null }, { orderId: "" }] })
```

## Summary

`mongoimport` CSV import requires either `--headerline` to use the first row as field names, or `--fields` to specify names manually. All values import as strings by default; use `--columnsHaveTypes` with type specifiers to preserve numbers, booleans, and dates. For CSV files with messy data, preprocessing with Python before import ensures better data quality. Always verify document counts and field types after import, and use upsert mode for idempotent imports that can be safely re-run.

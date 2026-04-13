# How to Use mongoexport to Export Data to JSON in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoexport, JSON, Data Export, Backup

Description: Learn how to use mongoexport to export MongoDB collections to JSON files, with options for filtering, field selection, and handling large datasets.

---

## What is mongoexport

`mongoexport` is a command-line utility that exports MongoDB collection data to JSON or CSV format. Unlike `mongodump` (which creates binary BSON archives), `mongoexport` creates human-readable text files suitable for data exchange, inspection, and import into other systems.

## Installation

mongoexport is included in the MongoDB Database Tools package:

```bash
# On Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# On macOS with Homebrew
brew install mongodb-database-tools

# Verify installation
mongoexport --version
```

## Basic JSON Export

```bash
# Export an entire collection to JSON
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   --out=users.json

# Connect to Atlas
mongoexport   --uri="mongodb+srv://user:password@cluster0.example.mongodb.net/myapp"   --collection=users   --out=users.json
```

The output is JSON Lines format (one document per line) by default:

```text
{"_id":{"$oid":"64aabbcc1234567890000001"},"name":"Alice","email":"alice@example.com","age":28}
{"_id":{"$oid":"64aabbcc1234567890000002"},"name":"Bob","email":"bob@example.com","age":32}
```

## Export as a JSON Array

```bash
# Export as a JSON array (wrapped in square brackets)
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   --jsonArray   --out=users-array.json
```

Output:

```json
[
  {"_id":{"$oid":"64aabbcc1234567890000001"},"name":"Alice","email":"alice@example.com"},
  {"_id":{"$oid":"64aabbcc1234567890000002"},"name":"Bob","email":"bob@example.com"}
]
```

## Filtering with a Query

```bash
# Export only active users
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   --query='{"status": "active"}'   --out=active-users.json

# Export users created in the last 30 days
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=orders   --query='{"createdAt": {"$gte": {"$date": "2026-03-01T00:00:00Z"}}}'   --out=recent-orders.json
```

## Selecting Specific Fields

```bash
# Export only specific fields (projection)
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   --fields=name,email,createdAt   --out=users-contact.json

# Export only name and email (note: _id is still included by default)
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   --fields=name,email   --out=users-contact-only.json
```

## Exporting with Sort and Limit

```bash
# Export the 100 most recent orders
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=orders   --sort='{"createdAt": -1}'   --limit=100   --out=latest-orders.json

# Skip the first 1000 and export the next 500
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=orders   --skip=1000   --limit=500   --out=orders-batch-2.json
```

## Using Pretty Print

```bash
# Pretty-print JSON output
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   --jsonArray   --pretty   --out=users-pretty.json
```

## Export to stdout and Pipe

```bash
# Export to stdout for piping
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=users   | gzip > users.json.gz

# Export and count lines
mongoexport   --uri="mongodb://localhost:27017"   --db=myapp   --collection=events   | wc -l
```

## Exporting with Authentication

```bash
# With username and password
mongoexport   --host=localhost   --port=27017   --username=exportUser   --password=secret   --authenticationDatabase=admin   --db=myapp   --collection=users   --out=users.json

# With TLS
mongoexport   --uri="mongodb://localhost:27017"   --tls   --tlsCAFile=/etc/ssl/mongodb-ca.pem   --db=myapp   --collection=users   --out=users.json
```

## Automating Exports with a Shell Script

```bash
#!/bin/bash
# export-collections.sh

MONGO_URI="mongodb://localhost:27017"
DATABASE="myapp"
EXPORT_DIR="/backup/exports/$(date +%Y%m%d)"
COLLECTIONS=("users" "orders" "products")

mkdir -p "$EXPORT_DIR"

for COLLECTION in "${COLLECTIONS[@]}"; do
  echo "Exporting $COLLECTION..."
  mongoexport     --uri="$MONGO_URI"     --db="$DATABASE"     --collection="$COLLECTION"     --jsonArray     --out="$EXPORT_DIR/$COLLECTION.json"

  if [ $? -eq 0 ]; then
    echo "  Exported $(wc -l < "$EXPORT_DIR/$COLLECTION.json") lines"
  else
    echo "  ERROR exporting $COLLECTION"
  fi
done

# Compress the export directory
tar -czf "/backup/exports/myapp-$(date +%Y%m%d).tar.gz" -C "/backup/exports" "$(date +%Y%m%d)"
rm -rf "$EXPORT_DIR"
echo "Export complete."
```

## Limitations of mongoexport

- Does not preserve BSON type information perfectly (use `mongodump` for full fidelity backups)
- Not recommended for large-scale backups where `mongodump` with BSON is more efficient
- Does not export indexes or collection metadata

## Summary

`mongoexport` is the go-to tool for exporting MongoDB data to human-readable JSON. It supports filtering with queries, field projection, sorting, and limiting, making it flexible for both full collection exports and targeted data extractions. For data exchange with other systems or quick inspection of collection data, `mongoexport` with `--jsonArray` and `--pretty` flags provides clean, readable output.

# How to Use bsondump to Inspect BSON Files in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bsondump, Backup, BSON, Developer Tool

Description: Learn how to use bsondump to convert MongoDB BSON backup files to readable JSON for inspection, debugging, and data verification.

---

MongoDB stores data in BSON (Binary JSON) format, and `mongodump` produces `.bson` files that are not human-readable. `bsondump` converts those files to JSON so you can inspect, grep, and verify backup contents without restoring to a running MongoDB instance.

## Installing bsondump

`bsondump` is part of the MongoDB Database Tools package:

```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# RHEL/CentOS
sudo yum install mongodb-database-tools

# macOS via Homebrew
brew install mongodb/brew/mongodb-database-tools
```

Verify installation:

```bash
bsondump --version
```

## Basic Usage: Convert BSON to JSON

Convert a `.bson` file to standard JSON output:

```bash
bsondump /var/backups/mongodb/myapp/users.bson
```

Output is one JSON document per line (newline-delimited JSON):

```json
{"_id":{"$oid":"64a1f2c3b4e5f6789abc1234"},"name":"Alice","email":"alice@example.com"}
{"_id":{"$oid":"64a1f2c3b4e5f6789abc1235"},"name":"Bob","email":"bob@example.com"}
```

## Writing Output to a File

Redirect output to a `.json` file for further processing:

```bash
bsondump \
  --outFile=/tmp/users.json \
  /var/backups/mongodb/myapp/users.bson
```

## Choosing Output Format

Use `--type` to control the output format:

```bash
# Extended JSON (default) - preserves BSON type information
bsondump --type=json /tmp/backup/orders.bson

# Non-standard debug format - human-readable but not parseable JSON
bsondump --type=debug /tmp/backup/orders.bson
```

The `debug` format shows raw BSON types useful for diagnosing corruption:

```text
{ "_id": ObjectId( "64a1f2c3b4e5f6789abc1234" ), "total": NumberDecimal( "99.99" ) }
```

## Inspecting a Specific Dump Directory

After running `mongodump`, the backup directory contains `.bson` and `.metadata.json` files:

```bash
ls /var/backups/mongodb/myapp/
# orders.bson  orders.metadata.json
# users.bson   users.metadata.json
```

Inspect a collection backup:

```bash
bsondump /var/backups/mongodb/myapp/orders.bson | head -5
```

## Searching Within a BSON File

Pipe bsondump output to `grep` or `jq` for filtering:

```bash
# Find all orders with status "failed"
bsondump /var/backups/mongodb/myapp/orders.bson | grep '"status":"failed"'

# Pretty-print a single document
bsondump /var/backups/mongodb/myapp/users.bson | head -1 | python3 -m json.tool
```

## Counting Documents in a BSON File

Count lines (documents) without restoring:

```bash
bsondump /var/backups/mongodb/myapp/orders.bson | wc -l
```

## Verifying Backup Completeness

Compare document counts between a live collection and its backup:

```bash
# Count in backup
BACKUP_COUNT=$(bsondump /var/backups/mongodb/myapp/orders.bson | wc -l)

# Count in live collection
LIVE_COUNT=$(mongosh --quiet --eval "db.orders.countDocuments()" myapp)

echo "Backup: $BACKUP_COUNT | Live: $LIVE_COUNT"
```

## Summary

`bsondump` is an essential tool for inspecting MongoDB backup files without needing a running database. It converts BSON to readable JSON, enabling document counting, content searching, and backup verification as part of your data management workflow.


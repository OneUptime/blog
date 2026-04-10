# How to Use RIOT for Redis Data Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RIOT, Migration, Data Transfer, DevOps

Description: Learn how to use RIOT (Redis Input/Output Tools) to migrate data between Redis instances, import from files, and export to various formats.

---

RIOT (Redis Input/Output Tools) is an open-source toolkit from Redis for migrating data between Redis instances, importing from databases or files, and exporting Redis data. It provides a command-line interface with support for filtering, transformation, and verification.

## Installation

```bash
# Download RIOT (choose the archive for your platform from the releases page)
# Available platforms: linux-x86_64, osx-aarch64, windows-x86_64, etc.
# https://github.com/redis/riot/releases
wget https://github.com/redis/riot/releases/latest/download/riot-standalone-<version>-<platform>.zip
unzip riot-standalone-*.zip
cd riot-standalone/bin

# Verify installation
./riot --version
```

Or using Homebrew on macOS:

```bash
brew install redis/tap/riot
```

## Redis to Redis Migration

The `replicate` command copies data from one Redis instance to another:

```bash
# Basic replication (source and target are positional arguments)
riot replicate redis://source-host:6379 redis://target-host:6379

# With authentication
riot replicate redis://:source-password@source-host:6379 \
  redis://:target-password@target-host:6379

# With TLS
riot replicate rediss://source-host:6379 rediss://target-host:6379
```

## Live Replication Mode

For minimal downtime, use `--mode live` which streams changes after the initial snapshot:

```bash
riot replicate --mode live \
  redis://:password@source-host:6379 \
  redis://:password@target-host:6379 \
  --threads 4 \
  --batch 500
```

## Filtering Keys During Migration

```bash
# Migrate only keys matching a pattern
riot replicate \
  redis://source-host:6379 \
  redis://target-host:6379 \
  --key-pattern "user:*"

# Migrate only specific key types
riot replicate \
  redis://source-host:6379 \
  redis://target-host:6379 \
  --key-type hash

# Migrate specific database number
riot replicate \
  redis://source-host:6379/1 \
  redis://target-host:6379/0
```

## Import from CSV File

```bash
# Sample CSV file: users.csv
# id,name,email,age
# 1001,Alice,alice@example.com,30
# 1002,Bob,bob@example.com,25

riot file-import -u redis://target-host:6379 \
  users.csv hset \
  --keyspace user \
  --key id
```

## Import from JSON File

```bash
# users.json
# [{"id":"1001","name":"Alice","email":"alice@example.com"}]

riot file-import -u redis://target-host:6379 \
  users.json hset \
  --keyspace user \
  --key id
```

## Export Redis Data to File

```bash
# Export to JSON
riot file-export -u redis://source-host:6379 \
  redis-export.json \
  --key-pattern "user:*"

# Export to CSV (hashes only)
riot file-export -u redis://source-host:6379 \
  export.csv \
  --key-type hash
```

## Import from a Relational Database

RIOT supports importing directly from SQL databases:

```bash
riot db-import -u redis://target-host:6379 \
  "SELECT id, name, email FROM users" \
  --jdbc-url "jdbc:postgresql://pg-host:5432/mydb" \
  --jdbc-user dbuser \
  --jdbc-pass dbpass \
  hset --keyspace user --key id
```

## Verify Migration Results

RIOT includes a compare command to verify that source and target are in sync:

```bash
riot compare \
  redis://:password@source-host:6379 \
  redis://:password@target-host:6379

# Sample output:
# Keys matched: 124532
# Keys missing in target: 0
# Keys with different values: 0
# Keys with different TTLs: 3
```

## Monitoring Progress

```bash
# RIOT shows progress by default
# To get more verbose output:
riot replicate \
  redis://source-host:6379 \
  redis://target-host:6379 \
  --progress log

# Output includes:
# [INFO] Keys/s: 45231 | Keys total: 1245300 | Errors: 0
```

## Summary

RIOT is a versatile Redis migration toolkit that handles Redis-to-Redis replication, file imports/exports, and database imports in a single CLI tool. Use `--mode live` for minimal downtime migrations and always run the `compare` command after migration to verify data integrity.

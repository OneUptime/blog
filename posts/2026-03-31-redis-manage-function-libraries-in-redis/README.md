# How to Manage Function Libraries in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Library, Management, Administration

Description: Learn how to list, update, delete, dump, and restore Redis function libraries for effective lifecycle management in production environments.

---

Redis function libraries require active lifecycle management: listing what's loaded, updating code, removing unused libraries, and backing up functions alongside data. This guide covers all management operations.

## List Loaded Libraries

View all libraries and their functions:

```bash
# List all libraries and their functions
redis-cli FUNCTION LIST

# Include full source code
redis-cli FUNCTION LIST WITHCODE

# Filter by library name
redis-cli FUNCTION LIST LIBRARYNAME mylib
```

Sample output:

```text
1) 1) "library_name"
   2) "mylib"
   3) "engine"
   4) "LUA"
   5) "functions"
   6) 1) 1) "name"
         2) "increment_with_ttl"
         3) "description"
         4) (nil)
         5) "flags"
         6) (empty array)
```

## Update an Existing Library

Use `REPLACE` to update library code without deleting it first:

```bash
redis-cli FUNCTION LOAD REPLACE "$(cat updated_mylib.lua)"
```

If you omit `REPLACE` and the library exists, you get:

```text
ERR Library 'mylib' already exists
```

## Delete a Library

Remove a library and all its registered functions:

```bash
redis-cli FUNCTION DELETE mylib
```

Verify it is gone:

```bash
redis-cli FUNCTION LIST LIBRARYNAME mylib
# Returns empty array
```

## Get Function Statistics

View running script info and engine details:

```bash
redis-cli FUNCTION STATS
```

Output includes:
- Running script info (if any)
- Engines info (Lua engine memory usage)

## Dump and Restore Functions

Back up all function libraries to a binary payload:

```bash
# Dump to a file
redis-cli FUNCTION DUMP > functions_backup.rdb

# Restore on another Redis instance
redis-cli -h new-redis FUNCTION RESTORE < functions_backup.rdb
```

The restore operation by default fails if a library already exists:

```bash
# Force replace during restore
redis-cli FUNCTION RESTORE REPLACE < functions_backup.rdb
```

## Flush All Functions

Remove all loaded function libraries at once (use with caution):

```bash
redis-cli FUNCTION FLUSH

# Or asynchronously
redis-cli FUNCTION FLUSH ASYNC
```

## Deployment Workflow

A typical CI/CD workflow for managing Redis functions:

```bash
#!/bin/bash
# deploy_functions.sh

REDIS_HOST=${1:-localhost}
REDIS_PORT=${2:-6379}

echo "Deploying Redis functions to $REDIS_HOST:$REDIS_PORT"

for lib_file in functions/*.lua; do
    lib_name=$(basename "$lib_file" .lua)
    echo "Loading library: $lib_name"
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FUNCTION LOAD REPLACE "$(cat $lib_file)"
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to load $lib_name"
        exit 1
    fi
done

echo "Verifying loaded libraries..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FUNCTION LIST

echo "Deployment complete"
```

## Inspect a Library's Source Code

Retrieve the source code of a loaded library:

```bash
redis-cli FUNCTION LIST LIBRARYNAME mylib WITHCODE
```

This lets you audit what code is running without needing the original file.

## Manage Functions in a Cluster

Functions replicate automatically from masters to their replicas, but must be loaded on each master shard separately in a Redis Cluster:

```bash
# Load function on all cluster nodes
for node in $(redis-cli --cluster info 10.0.0.1:6379 | grep ':' | cut -d' ' -f1); do
    redis-cli -h ${node%:*} -p ${node#*:} FUNCTION LOAD REPLACE "$(cat mylib.lua)"
done
```

## Summary

Manage Redis function libraries with `FUNCTION LIST` to inspect, `FUNCTION LOAD REPLACE` to update, `FUNCTION DELETE` to remove, and `FUNCTION DUMP`/`RESTORE` for backup and migration. Include function loading in your CI/CD pipeline with `REPLACE` to enable zero-downtime updates. For Redis Cluster deployments, load functions on each master shard explicitly since they replicate to replicas but not across shards.

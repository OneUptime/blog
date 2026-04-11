# How to Use MySQL Shell Load Utilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Load, Restore, Migration

Description: Learn how to use MySQL Shell's util.loadDump() to restore database dumps quickly with parallel loading, progress tracking, and resume support.

---

## Introduction

MySQL Shell's `util.loadDump()` is the counterpart to the dump utilities. It restores dumps created by `util.dumpInstance()`, `util.dumpSchemas()`, or `util.dumpTables()`. The load utility uses parallel execution to maximize throughput, supports resuming interrupted loads, and provides detailed progress reporting.

## Basic Usage

To load a dump from a local directory:

```javascript
util.loadDump("/backups/mydb_dump")
```

This restores all schemas and data found in the dump directory using the default of 4 parallel threads.

## Common Load Options

```javascript
util.loadDump("/backups/mydb_dump", {
  threads: 8,
  progressFile: "/tmp/load_progress.json",
  resetProgress: false,
  deferTableIndexes: "fulltext",
  updateGtidSet: "append"
})
```

Key options:

- `threads` - parallel load threads (default: 4)
- `progressFile` - tracks progress for resume on failure
- `resetProgress` - set to `true` to start over, ignoring previous progress
- `deferTableIndexes` - defer index creation to speed up initial data load (`all`, `fulltext`, `off`)
- `updateGtidSet` - how to handle GTIDs on the target (`off`, `append`, `replace`)

## Loading Specific Schemas or Tables

To load only certain schemas from a full instance dump:

```javascript
util.loadDump("/backups/full_instance_dump", {
  includeSchemas: ["mydb", "reporting"]
})
```

To load specific tables:

```javascript
util.loadDump("/backups/mydb_dump", {
  includeTables: ["mydb.orders", "mydb.customers"]
})
```

To exclude tables:

```javascript
util.loadDump("/backups/mydb_dump", {
  excludeTables: ["mydb.audit_log"]
})
```

## Resuming a Failed Load

If a load is interrupted, resume it by pointing to the same progress file:

```javascript
util.loadDump("/backups/mydb_dump", {
  progressFile: "/tmp/load_progress.json"
})
```

The utility reads the progress file, skips already-loaded chunks, and continues from where it left off.

## Loading from Amazon S3

```javascript
util.loadDump("backups/mydb_dump", {
  s3BucketName: "my-bucket",
  s3Region: "us-east-1",
  threads: 16
})
```

## Dry Run Mode

To validate a dump without actually loading data:

```javascript
util.loadDump("/backups/mydb_dump", {
  dryRun: true
})
```

This checks compatibility and reports any issues before committing to the load.

## Handling Users

When loading from an instance dump that includes users:

```javascript
util.loadDump("/backups/full_instance_dump", {
  loadUsers: true,
  excludeUsers: ["'root'@'localhost'"]
})
```

## Monitoring Progress

During loading, MySQL Shell prints progress lines like:

```text
Loading DDL and Data from '/backups/mydb_dump'
2 thds loading - 100% (1.50 GB / 1.50 GB), 45.23 MB/s, done
```

After completion, a summary shows total rows, bytes, and elapsed time.

## Summary

`util.loadDump()` is the recommended way to restore MySQL Shell dumps. Its parallel loading, resume support, selective schema/table filtering, and cloud storage compatibility make it far more efficient than traditional `mysql < dump.sql` approaches for large datasets. Always use the `progressFile` option for large loads to enable safe resume on failure.

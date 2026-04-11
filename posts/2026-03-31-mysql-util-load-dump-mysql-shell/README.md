# How to Use util.loadDump() in MySQL Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Restore, Load, Migration

Description: Learn how to use MySQL Shell's util.loadDump() to restore database dumps with parallel threads, resume support, schema filtering, and progress tracking.

---

## Introduction

`util.loadDump()` is MySQL Shell's companion utility to the dump tools. It loads dumps created by `util.dumpInstance()`, `util.dumpSchemas()`, or `util.dumpTables()` with parallel execution, automatic decompression, and the ability to resume interrupted loads. It is significantly faster than using `mysql < dump.sql` for large datasets.

## Basic Syntax

```javascript
util.loadDump(url[, options])
```

- `url` - local directory path or cloud storage URL containing the dump
- `options` - optional configuration object

## Simple Restore

```javascript
util.loadDump("/backups/mydb_dump")
```

This restores all schemas and data from the dump directory using the default 4 threads.

## Parallel Loading

Increase threads for faster restoration on capable hardware:

```javascript
util.loadDump("/backups/mydb_dump", {
  threads: 16
})
```

## Resuming an Interrupted Load

Always specify a `progressFile` for large loads to enable safe resume:

```javascript
util.loadDump("/backups/mydb_dump", {
  threads: 8,
  progressFile: "/tmp/load_progress.json"
})
```

If the load is interrupted, re-run the same command. The utility reads the progress file and continues from the last completed chunk.

To start over and ignore existing progress:

```javascript
util.loadDump("/backups/mydb_dump", {
  progressFile: "/tmp/load_progress.json",
  resetProgress: true
})
```

## Loading Specific Schemas

To load only certain schemas from an instance dump:

```javascript
util.loadDump("/backups/full_instance_dump", {
  includeSchemas: ["mydb", "reporting"]
})
```

## Loading Specific Tables

```javascript
util.loadDump("/backups/mydb_dump", {
  includeTables: ["mydb.orders", "mydb.customers"]
})
```

## Excluding Tables

```javascript
util.loadDump("/backups/mydb_dump", {
  excludeTables: ["mydb.temp_cache", "mydb.sessions"]
})
```

## Deferring Index Creation

Deferring index creation until after data load can dramatically speed up large table restores:

```javascript
util.loadDump("/backups/mydb_dump", {
  deferTableIndexes: "all"
})
```

Options for `deferTableIndexes`: `off`, `fulltext`, `all`.

## Dry Run Mode

Validate the dump and check for compatibility issues without loading data:

```javascript
util.loadDump("/backups/mydb_dump", {
  dryRun: true
})
```

## Loading from Amazon S3

```javascript
util.loadDump("backups/mydb_dump", {
  s3BucketName: "my-bucket",
  s3Region: "us-east-1",
  threads: 16
})
```

## Handling GTIDs for Replication

When restoring to a replica or after a failover, configure GTID handling:

```javascript
util.loadDump("/backups/mydb_dump", {
  updateGtidSet: "append"
})
```

Options: `off`, `append`, `replace`.

## Progress Output

During loading, MySQL Shell shows real-time feedback:

```text
Loading DDL and Data from '/backups/mydb_dump'
8 thds loading - 100% (4.20 GB / 4.20 GB), 120.5 MB/s
Duration: 00:00:35s, schemas loaded: 2, tables loaded: 28
```

## Summary

`util.loadDump()` is the standard way to restore MySQL Shell dumps. Its parallel loading, resume capability, table filtering, deferred index creation, and GTID management make it the most efficient restore tool for MySQL. Pair it with `dumpInstance()` or `dumpSchemas()` to build a reliable backup-and-restore pipeline.

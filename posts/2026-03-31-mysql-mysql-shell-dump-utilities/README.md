# How to Use MySQL Shell Dump Utilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Dump, Backup, Migration

Description: Learn how to use MySQL Shell's util.dumpInstance(), util.dumpSchemas(), and util.dumpTables() to create fast, parallel database backups.

---

## Introduction

MySQL Shell includes a set of powerful dump utilities under the `util` global object. These utilities offer significant performance advantages over `mysqldump` by using parallel execution, chunked exports, and compressed output. They support exporting to local directories or cloud storage like Amazon S3 and Oracle Cloud Object Storage.

## Overview of Dump Utilities

MySQL Shell provides three main dump utilities:

- `util.dumpInstance()` - dumps the entire MySQL instance
- `util.dumpSchemas()` - dumps one or more specific schemas
- `util.dumpTables()` - dumps specific tables from a schema

All utilities produce a directory of files including DDL scripts, data files (TSV), and metadata JSON files.

## Using util.dumpSchemas()

To dump a single schema to a local directory:

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_dump")
```

To dump multiple schemas:

```javascript
util.dumpSchemas(["mydb", "reporting"], "/backups/multi_dump")
```

### Common Options

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_dump", {
  threads: 4,
  compression: "zstd",
  consistent: true,
  ddlOnly: false,
  dataOnly: false
})
```

- `threads` - number of parallel threads (default: 4)
- `compression` - `zstd` (default), `gzip`, or `none`
- `consistent` - ensures a consistent snapshot using a global read lock
- `ddlOnly` - exports only DDL, no data
- `dataOnly` - exports only data, no DDL

## Using util.dumpInstance()

To dump the entire MySQL instance:

```javascript
util.dumpInstance("/backups/full_instance_dump")
```

This exports all schemas except system schemas (`information_schema`, `mysql`, `ndbinfo`, `performance_schema`, `sys`). To include user accounts:

```javascript
util.dumpInstance("/backups/full_instance_dump", {
  users: true,
  excludeSchemas: ["test"]
})
```

## Using util.dumpTables()

To dump specific tables:

```javascript
util.dumpTables("mydb", ["orders", "customers"], "/backups/tables_dump")
```

This is useful for partial exports when you only need a subset of tables.

## Filtering Rows with where

You can filter rows during export:

```javascript
util.dumpTables("mydb", ["orders"], "/backups/orders_dump", {
  where: {"mydb.orders": "status = 'completed'"}
})
```

## Dumping to Amazon S3

MySQL Shell can dump directly to S3:

```javascript
util.dumpInstance("backups/instance_dump", {
  s3BucketName: "my-bucket",
  s3Region: "us-east-1"
})
```

## Checking Dump Output

After a dump, the directory contains:

```text
mydb_dump/
  @.json            -- instance metadata
  mydb.json         -- schema metadata
  mydb@orders.sql   -- table DDL
  mydb@orders.tsv.zst -- table data (compressed)
  mydb@orders@@0.tsv.zst -- chunked data files
```

## Summary

MySQL Shell dump utilities provide a fast, flexible alternative to `mysqldump`. With support for parallel threads, compression, filtering, and cloud storage targets, they are well suited for production database backups and migrations. Use `dumpSchemas()` for schema-level exports, `dumpInstance()` for full instance backups, and `dumpTables()` for targeted table exports.

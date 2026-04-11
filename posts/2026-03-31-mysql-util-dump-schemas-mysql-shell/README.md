# How to Use util.dumpSchemas() in MySQL Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Backup, Schema, Export

Description: Learn how to use MySQL Shell's util.dumpSchemas() to export one or more database schemas with parallel threads, filtering, and compression options.

---

## Introduction

`util.dumpSchemas()` is MySQL Shell's utility for exporting one or more specific schemas from a MySQL server. It is more targeted than `util.dumpInstance()`, making it ideal for schema-level backups, migrations between databases, or creating development datasets from a subset of production schemas.

## Basic Syntax

```javascript
util.dumpSchemas(schemas, outputUrl[, options])
```

- `schemas` - an array of schema names to export
- `outputUrl` - local directory path or cloud storage URL
- `options` - optional configuration object

## Simple Example

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_schema_dump")
```

To dump multiple schemas at once:

```javascript
util.dumpSchemas(["mydb", "analytics", "reporting"], "/backups/multi_schema_dump")
```

## Parallel Export with Options

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_dump", {
  threads: 8,
  compression: "zstd",
  consistent: true
})
```

Setting `threads` to a higher value speeds up exports for large schemas with many tables. The `consistent: true` option ensures a point-in-time consistent dump by using `FLUSH TABLES WITH READ LOCK` (or `LOCK TABLES` if the user lacks the `RELOAD` privilege), starting consistent snapshot transactions across all threads, and then issuing `LOCK INSTANCE FOR BACKUP` before releasing the initial lock. Note that `consistent` defaults to `true`, so this is explicitly shown here for clarity.

## Exporting Only DDL

To export just the schema structure without any data:

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_ddl", {
  ddlOnly: true
})
```

This is useful for documenting schema structure or seeding a new environment.

## Exporting Only Data

To export only table data, skipping DDL:

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_data", {
  dataOnly: true
})
```

## Excluding Tables

To exclude specific tables from the dump:

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_dump", {
  excludeTables: ["mydb.audit_log", "mydb.temp_data"]
})
```

## Filtering Rows with where

You can export a filtered subset of rows:

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_active", {
  where: {
    "mydb.orders": "status = 'active'",
    "mydb.users": "created_at > '2025-01-01'"
  }
})
```

## Limiting Rows with a Condition

You can approximate row limiting by using a WHERE condition that restricts the result set:

```javascript
util.dumpSchemas(["mydb"], "/backups/mydb_sample", {
  where: {"mydb.events": "id <= 10000"}
})
```

## Dumping to Cloud Storage

```javascript
util.dumpSchemas(["mydb"], "schema-dumps/mydb", {
  s3BucketName: "my-bucket",
  s3Region: "eu-west-1",
  threads: 16
})
```

## Verifying the Output

After dumping, check the directory contents:

```bash
ls -lh /backups/mydb_schema_dump/
```

You should see `.sql` DDL files, `.tsv.zst` data files, and `.json` metadata files. To validate without loading:

```javascript
util.loadDump("/backups/mydb_schema_dump", {dryRun: true})
```

## Summary

`util.dumpSchemas()` is the right tool when you need schema-level exports rather than a full instance dump. It supports parallel execution, compression, row filtering, DDL-only or data-only modes, and cloud storage targets. Combined with `util.loadDump()`, it provides a robust schema migration and backup workflow.

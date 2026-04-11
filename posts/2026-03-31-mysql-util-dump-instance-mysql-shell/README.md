# How to Use util.dumpInstance() in MySQL Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Backup, Instance, Dump

Description: Learn how to use MySQL Shell's util.dumpInstance() to export an entire MySQL server instance with parallel threads, compression, and cloud storage support.

---

## Introduction

`util.dumpInstance()` is MySQL Shell's utility for exporting a complete MySQL server instance. Unlike `mysqldump`, it runs in parallel across multiple threads, produces compressed output, and generates files compatible with `util.loadDump()` for fast restoration. It is the recommended approach for full instance backups and migrations to MySQL HeatWave or other targets.

## Basic Syntax

```javascript
util.dumpInstance(outputUrl[, options])
```

The `outputUrl` is a local directory path or a cloud storage URL. The directory must not already exist - MySQL Shell creates it.

## Simple Example

```javascript
util.dumpInstance("/backups/instance_2026_03_31")
```

This exports all user schemas, DDL, data, and optionally user accounts to the specified directory.

## Key Options

```javascript
util.dumpInstance("/backups/instance_2026_03_31", {
  threads: 8,
  compression: "zstd",
  consistent: true,
  users: true,
  excludeSchemas: ["test", "legacy_db"],
  excludeUsers: ["'monitor'@'%'"]
})
```

Option details:

- `threads` - parallel export threads; default 4, increase for large databases
- `compression` - `zstd` (default, best ratio), `gzip`, or `none`
- `consistent` - acquires a global read lock for a consistent snapshot (default: `true`)
- `users` - include user account DDL in the dump (default: `true`)
- `excludeSchemas` - list of schema names to skip
- `excludeUsers` - list of user accounts to skip from export

## DDL-Only Dump

To export only the schema structure without data:

```javascript
util.dumpInstance("/backups/schema_only", {
  ddlOnly: true
})
```

## Data-Only Dump

To export only data, skipping DDL:

```javascript
util.dumpInstance("/backups/data_only", {
  dataOnly: true
})
```

## Dumping to OCI Object Storage

```javascript
util.dumpInstance("mydb_backup", {
  osBucketName: "my-oci-bucket",
  osNamespace: "my-namespace",
  ociConfigFile: "~/.oci/config"
})
```

## Dumping to Amazon S3

```javascript
util.dumpInstance("backups/instance", {
  s3BucketName: "my-bucket",
  s3Region: "us-east-1",
  threads: 16
})
```

## Output Directory Structure

After `dumpInstance()` completes, the directory contains:

```text
instance_2026_03_31/
  @.done.json          -- completion metadata
  @.json               -- instance-level metadata
  @.post.sql           -- post-load SQL (user grants)
  @.sql                -- pre-load SQL
  mydb.json            -- schema metadata
  mydb@orders.sql      -- table DDL
  mydb@orders@@0.tsv.zst  -- chunked, compressed data
```

## Progress and Verification

During the dump, MySQL Shell displays real-time progress:

```text
Dumping instance into '/backups/instance_2026_03_31'
2 thds dumping - 99% (2.34 GB / 2.35 GB), 78.5 MB/s
Duration: 00:00:30s, schemas dumped: 5, tables dumped: 42
```

To verify a completed dump before restoration, use `dryRun` with `loadDump`:

```javascript
util.loadDump("/backups/instance_2026_03_31", {dryRun: true})
```

## Summary

`util.dumpInstance()` provides a production-grade full-instance export with features like parallelism, compression, cloud targets, and consistent snapshots. Use it for scheduled backups, server migrations, or setting up replicas, and pair it with `util.loadDump()` for a complete backup-and-restore workflow.

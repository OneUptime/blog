# How to Use MySQL Shell for Data Import and Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Import, Export, Data

Description: Learn how to import and export data using MySQL Shell's util.importTable(), util.exportTable(), and the dump utilities for efficient data transfer.

---

## Introduction

MySQL Shell provides multiple utilities for importing and exporting data. Beyond the dump utilities (`dumpInstance`, `dumpSchemas`, `loadDump`), it also offers `util.importTable()` for fast CSV/TSV imports and `util.exportTable()` for exporting individual tables to delimited files. These tools support parallel execution, chunked processing, and remote file sources.

## Exporting a Table with util.exportTable()

`util.exportTable()` exports a single table to a delimited text file (TSV or CSV):

```javascript
util.exportTable("mydb.orders", "/data/exports/orders.tsv")
```

### Export Options

```javascript
util.exportTable("mydb.orders", "/data/exports/orders.tsv", {
  fieldsTerminatedBy: ",",
  fieldsEnclosedBy: '"',
  linesTerminatedBy: "\n",
  compression: "zstd",
  where: "status = 'completed'",
  maxRate: "100M"
})
```

To export as CSV:

```javascript
util.exportTable("mydb.customers", "/data/exports/customers.csv", {
  dialect: "csv"
})
```

Built-in dialects: `default` (matches `SELECT...INTO OUTFILE` defaults), `csv`, `csv-unix`, `tsv`.

## Importing Data with util.importTable()

`util.importTable()` imports delimited files into a MySQL table using parallel threads and chunked loading:

```javascript
util.importTable("/data/imports/orders.tsv", {
  schema: "mydb",
  table: "orders"
})
```

### Import Options

```javascript
util.importTable("/data/imports/orders.csv", {
  schema: "mydb",
  table: "orders",
  dialect: "csv",
  threads: 8,
  skipRows: 1,
  replaceDuplicates: true,
  bytesPerChunk: "134217728"
})
```

- `skipRows` - number of header rows to skip
- `replaceDuplicates` - use `REPLACE INTO` instead of `INSERT INTO`
- `bytesPerChunk` - controls the chunk size for parallel processing of a single file
- `threads` - parallel import threads

## Importing from a URL

MySQL Shell can import files from HTTPS URLs:

```javascript
util.importTable("https://example.com/data/products.tsv", {
  schema: "mydb",
  table: "products"
})
```

## Importing Multiple Files

Use glob patterns to import multiple files at once:

```javascript
util.importTable(["/data/exports/orders_*.tsv"], {
  schema: "mydb",
  table: "orders",
  threads: 4
})
```

## Using Dump and Load for Full Schema Export

For larger datasets, use the dump and load utilities for a complete schema export-import workflow:

```javascript
// Export
util.dumpSchemas(["mydb"], "/backups/mydb_export", {threads: 8})

// Import on another server
util.loadDump("/backups/mydb_export", {threads: 8})
```

## Importing from Amazon S3

```javascript
util.importTable("data/orders.csv", {
  schema: "mydb",
  table: "orders",
  dialect: "csv",
  s3BucketName: "my-bucket",
  s3Region: "us-east-1"
})
```

## Monitoring Import Progress

During import, MySQL Shell shows throughput:

```text
Importing from file '/data/imports/orders.csv'
8 thds loading - 100% (512.00 MB / 512.00 MB), 85.2 MB/s
Rows handled: 3200000, warnings: 0
Duration: 00:00:06s
```

## Summary

MySQL Shell's `util.importTable()` and `util.exportTable()` provide high-performance single-table data transfer with dialect support, parallel execution, and cloud storage integration. For full schema or instance-level data migration, use `dumpSchemas()`/`dumpInstance()` with `loadDump()` for the most efficient and reliable results.

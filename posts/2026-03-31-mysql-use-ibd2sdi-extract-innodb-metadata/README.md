# How to Use ibd2sdi to Extract InnoDB Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Metadata, Recovery, Tool

Description: Learn how to use the ibd2sdi utility to extract serialized dictionary information from InnoDB tablespace files for recovery and analysis.

---

## What is ibd2sdi?

`ibd2sdi` is a MySQL utility introduced in MySQL 8.0 that reads the serialized dictionary information (SDI) embedded directly inside InnoDB tablespace files (`.ibd`). Before MySQL 8.0, table metadata was stored in `.frm` files. Starting with 8.0, InnoDB embeds this metadata inside the tablespace itself using the SDI format.

This tool is invaluable when you need to inspect table structure without a running MySQL instance, or when recovering from data dictionary corruption.

## Basic Usage

The simplest invocation reads an `.ibd` file and prints JSON metadata to stdout:

```bash
ibd2sdi /var/lib/mysql/mydb/orders.ibd
```

To read from the system tablespace (`ibdata1`):

```bash
ibd2sdi /var/lib/mysql/ibdata1
```

To pretty-print the output, pipe it through `jq`:

```bash
ibd2sdi /var/lib/mysql/mydb/orders.ibd | jq .
```

## Extracting Specific SDI Types

SDI records have types: `1` for table definitions and `2` for tablespace definitions. You can filter by type:

```bash
# Extract only table definition records
ibd2sdi --type=1 /var/lib/mysql/mydb/orders.ibd

# Extract only tablespace records
ibd2sdi --type=2 /var/lib/mysql/mydb/orders.ibd
```

## Listing SDI IDs Without Full Output

To see available SDI record IDs without dumping the full JSON, use `--skip-data`:

```bash
ibd2sdi --skip-data /var/lib/mysql/mydb/orders.ibd
```

Example output:

```json
["ibd2sdi"
,
{
    "type": 1,
    "id": 2
}
,
{
    "type": 2,
    "id": 1
}
]
```

You can then fetch a specific record by ID:

```bash
ibd2sdi --id=2 /var/lib/mysql/mydb/orders.ibd
```

## Parsing Column Information from JSON Output

The JSON output contains full column definitions. Use `jq` to extract column names and types:

```bash
ibd2sdi /var/lib/mysql/mydb/orders.ibd \
  | jq '.[1].object.dd_object.columns[] | {name: .name, type: .column_type_utf8}'
```

Example output:

```json
{
  "name": "id",
  "type": "int"
}
{
  "name": "customer_id",
  "type": "int"
}
{
  "name": "created_at",
  "type": "datetime"
}
```

## Saving Output to a File

For large tablespaces, redirect output to a file for offline analysis:

```bash
ibd2sdi /var/lib/mysql/mydb/orders.ibd > orders_sdi.json
```

## Checking the MySQL Version that Created the Tablespace

The SDI output also includes version metadata inside each record's `object` field:

```bash
ibd2sdi /var/lib/mysql/mydb/orders.ibd | jq '.[1].object | {mysqld_version_id, dd_version, sdi_version}'
```

This prints the MySQL version ID that last wrote the file, along with the data dictionary and SDI versions, useful for cross-version recovery scenarios.

## Common Recovery Scenario

When a MySQL instance fails to start due to data dictionary issues, you can use `ibd2sdi` to extract the schema from individual tablespace files and reconstruct `CREATE TABLE` statements manually for a fresh instance:

```bash
# On a fresh instance, recreate the table using extracted metadata
ibd2sdi /backup/mydb/orders.ibd | jq -r '.[1].object.dd_object' > orders_meta.json
```

Then use the extracted column, index, and constraint data to write the DDL and use `ALTER TABLE ... IMPORT TABLESPACE` to restore data.

## Summary

`ibd2sdi` is an essential low-level diagnostic tool for MySQL 8.0+ environments. It lets you read table structure directly from `.ibd` files without a running server, making it critical for crash recovery, schema documentation, and cross-instance migrations. Always locate the correct `.ibd` file under the MySQL data directory and pipe the JSON output through `jq` for readable analysis.

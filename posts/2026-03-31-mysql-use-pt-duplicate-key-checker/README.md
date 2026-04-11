# How to Use pt-duplicate-key-checker for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Percona, Optimization, Schema

Description: Learn how to use pt-duplicate-key-checker to find and remove redundant or duplicate indexes in MySQL databases to improve write performance.

---

## What is pt-duplicate-key-checker?

`pt-duplicate-key-checker` is a Percona Toolkit utility that examines MySQL tables and reports indexes that are duplicates of other indexes, or that are made redundant by other indexes. Duplicate indexes waste space and slow down `INSERT`, `UPDATE`, and `DELETE` operations because MySQL must maintain all copies. This tool generates the `ALTER TABLE` statements needed to drop them.

## Basic Usage

Check all tables in a database:

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --databases=mydb
```

## Checking All Databases

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=root \
  --password=secret
```

## Understanding the Output

Example output for a table with duplicate indexes:

```text
# ########################################################################
# mydb.orders
# ########################################################################

# idx_customer_id is a duplicate of idx_customer_created
# Key definitions:
#   idx_customer_id (customer_id)
#   idx_customer_created (customer_id, created_at)
# Column types:
#   customer_id int unsigned NOT NULL
#   created_at datetime NOT NULL
# To remove this duplicate index, execute:
ALTER TABLE `mydb`.`orders` DROP INDEX `idx_customer_id`;
```

In this example, `idx_customer_id` is a left-prefix duplicate of `idx_customer_created`, so MySQL can use `idx_customer_created` for all queries that need `customer_id`.

## Types of Duplicates Detected

The tool identifies several duplicate patterns:

```text
# Exact duplicate: same columns in same order
idx_a (col1, col2)
idx_b (col1, col2)  -- exact duplicate, drop either one

# Left-prefix duplicate: one index is a leading prefix of another
idx_col1 (col1)
idx_col1_col2 (col1, col2)  -- idx_col1 is redundant

# Primary key duplicate: a secondary index duplicates the PK
PRIMARY KEY (id)
idx_id (id)  -- redundant, drop idx_id
```

## Verbose Output with Foreign Key Checks

Foreign key indexes should not be dropped even if they appear redundant. Use `--verbose` to see foreign key information:

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --databases=mydb \
  --verbose
```

The tool notes which indexes are used by foreign key constraints, so you can avoid dropping them.

## Saving the Output for Review

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --databases=mydb > duplicate_keys_$(date +%Y%m%d).txt
```

Review the file carefully before executing any `ALTER TABLE` statements.

## Applying the Suggested Changes

Extract only the `ALTER TABLE` lines from the output and review them before running:

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --databases=mydb \
  | grep "^ALTER TABLE"
```

Execute the statements on a staging environment first, then apply to production during a maintenance window.

## Checking a Specific Table

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --tables=mydb.orders,mydb.customers
```

## Summary

`pt-duplicate-key-checker` is a quick, read-only analysis tool that can identify significant optimization opportunities in MySQL schemas that have grown organically over time. Run it periodically, review the suggested `ALTER TABLE` statements carefully (especially around foreign keys), and test drops on staging before touching production tables.

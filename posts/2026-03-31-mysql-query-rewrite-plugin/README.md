# How to Use the MySQL Query Rewrite Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Rewrite, Plugin, Optimization, SQL

Description: Learn how to install and use the MySQL Query Rewrite Plugin to transparently rewrite problematic queries without modifying application source code.

---

## Overview

The MySQL Query Rewrite Plugin intercepts incoming SQL statements and rewrites them before execution. This is invaluable when you cannot change application code but need to fix inefficient queries, add hints, or redirect queries to different tables - all transparently to the application.

## Installing the Query Rewrite Plugin

The plugin requires both a server-side plugin and a helper stored procedures package:

```bash
# Load the SQL script that installs the plugin and creates helper procedures
mysql -u root -p < /usr/share/mysql/install_rewriter.sql
```

Or install from within the MySQL client:

```sql
-- Run the install script (installs the plugin, schema, and stored procedures)
SOURCE /usr/share/mysql/install_rewriter.sql;

-- Verify installation
SHOW GLOBAL VARIABLES LIKE 'rewriter_enabled';
```

## How the Rewrite Plugin Works

```text
1. Application sends: SELECT * FROM users WHERE id = 5
2. Plugin checks query_rewrite.rewrite_rules table
3. If match found: rewrites query before execution
4. MySQL executes the rewritten query
5. Application receives results (unaware of rewrite)
```

## Adding Rewrite Rules

Rules are stored in the `query_rewrite.rewrite_rules` table:

```sql
-- Add a rewrite rule: replace SELECT * with specific columns
INSERT INTO query_rewrite.rewrite_rules
    (pattern, replacement, pattern_database)
VALUES
    ('SELECT * FROM users WHERE id = ?',
     'SELECT id, name, email FROM users WHERE id = ?',
     'myapp');

-- Flush rules to activate them
CALL query_rewrite.flush_rewrite_rules();
```

The `?` is a placeholder that matches any literal value in the query.

## Practical Rewrite Examples

### Force Index Usage

```sql
-- Rewrite to add an index hint for a poorly-planned query
INSERT INTO query_rewrite.rewrite_rules (pattern, replacement, pattern_database)
VALUES (
    'SELECT id, amount FROM orders WHERE customer_id = ? AND status = ?',
    'SELECT id, amount FROM orders USE INDEX (idx_customer_status) WHERE customer_id = ? AND status = ?',
    'myapp'
);

CALL query_rewrite.flush_rewrite_rules();
```

### Add Query Timeout Hint

```sql
-- Add a MAX_EXECUTION_TIME hint to a slow query
INSERT INTO query_rewrite.rewrite_rules (pattern, replacement, pattern_database)
VALUES (
    'SELECT COUNT(*) FROM large_log_table WHERE created_at > ?',
    'SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) FROM large_log_table WHERE created_at > ?',
    'myapp'
);

CALL query_rewrite.flush_rewrite_rules();
```

### Redirect to a Different Table

```sql
-- Redirect queries from archived table to active table
INSERT INTO query_rewrite.rewrite_rules (pattern, replacement)
VALUES (
    'SELECT * FROM orders_archive WHERE id = ?',
    'SELECT * FROM orders WHERE id = ?'
);

CALL query_rewrite.flush_rewrite_rules();
```

## Verifying Rules Are Working

```sql
-- Check rule status after flush
SELECT id, pattern, replacement, enabled, message
FROM query_rewrite.rewrite_rules;

-- A NULL message means the rule compiled successfully
-- An error message indicates a syntax problem in the rule
```

Monitor rewrite activity:

```sql
-- Check if rewrites are happening
SHOW STATUS LIKE 'Rewriter%';
```

```text
Rewriter_number_loaded_rules      - Rules currently loaded
Rewriter_number_reloads           - Number of times the rules table has been reloaded
Rewriter_number_rewritten_queries - Queries rewritten since startup
Rewriter_reload_error             - Whether an error occurred on last reload (ON/OFF)
```

## Disabling and Removing Rules

```sql
-- Temporarily disable a rule without deleting it
UPDATE query_rewrite.rewrite_rules
SET enabled = 'NO'
WHERE id = 3;

CALL query_rewrite.flush_rewrite_rules();

-- Delete a rule permanently
DELETE FROM query_rewrite.rewrite_rules WHERE id = 3;
CALL query_rewrite.flush_rewrite_rules();
```

## Summary

The MySQL Query Rewrite Plugin provides a powerful way to fix query problems at the database layer without touching application code. Install it via the `install_rewriter.sql` script, add rules to `query_rewrite.rewrite_rules` using literal SQL patterns with `?` placeholders, and activate them with `CALL query_rewrite.flush_rewrite_rules()`. Use it to add index hints, set query timeouts, or transform problematic query patterns - and always verify rules compiled without errors by checking the `message` column after flushing.

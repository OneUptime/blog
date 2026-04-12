# How MySQL Processes a Query

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Parser, Optimizer, Internal

Description: Learn how MySQL processes a SQL query from parsing to execution, covering the parser, optimizer, execution engine, and storage engine interaction.

---

## The Query Processing Pipeline

When a client sends a SQL statement, MySQL routes it through a multi-stage pipeline before returning results. Understanding each stage helps diagnose performance problems and write more effective queries.

## Stage 1: Connection and Protocol Handling

The client connects to MySQL over TCP/IP or a UNIX socket. MySQL authenticates the user and checks privileges. Each thread has its own connection context with session variables, caches, and security context.

```sql
-- View current connections
SHOW PROCESSLIST;
-- Each row is a thread handling one connection
```

## Stage 2: Query Cache (Removed in MySQL 8.0)

MySQL 5.7 and earlier had a query cache that returned cached result sets for identical SELECT statements. It was removed in MySQL 8.0 due to scalability problems - a global mutex serialized all cache lookups. Application-level caching (Redis, Memcached) replaced it.

## Stage 3: Parser

The SQL string is parsed into an abstract syntax tree (AST). The parser validates syntax and checks that the statement is structurally correct SQL:

```sql
-- If parsing fails, you see syntax errors
SELECT * FORM orders;
-- ERROR 1064 (42000): You have an error in your SQL syntax
```

The expansion of `SELECT *` to the actual column list happens later during the preprocessing/resolution phase, not during parsing.

## Stage 4: Preprocessor

The preprocessor checks semantic validity: do the referenced tables and columns exist? Does the user have privileges? Are there ambiguous column names?

```sql
-- Preprocessor catches this
SELECT nonexistent_column FROM orders;
-- ERROR 1054 (42S22): Unknown column 'nonexistent_column'
```

## Stage 5: Optimizer

The optimizer is the most complex stage. It takes the preprocessed query tree and generates a physical execution plan:

1. Rewrites equivalent query forms (e.g., subqueries to joins)
2. Evaluates available indexes and estimates row counts
3. Chooses join order for multi-table queries
4. Selects access methods (index scan vs. full table scan)

```sql
-- See what the optimizer chooses
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'pending';
-- The 'key' column shows which index was selected
```

```sql
-- See the optimizer's cost estimates
EXPLAIN FORMAT=JSON SELECT ...;
```

## Stage 6: Execution Engine

The execution engine implements the physical plan produced by the optimizer. It calls the storage engine API to read and write rows. For joins, it implements nested-loop join and hash join (added in MySQL 8.0.18) strategies.

For `EXPLAIN ANALYZE` (MySQL 8.0.18+), the execution engine instruments actual row counts and timings:

```sql
EXPLAIN ANALYZE
SELECT o.id, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'\G
```

## Stage 7: Storage Engine

The execution engine calls the storage engine (InnoDB, MyISAM, etc.) through a standardized handler API. InnoDB retrieves rows from the buffer pool or disk, applies MVCC visibility rules to return only rows the current transaction should see, and returns them to the execution engine.

```sql
-- Check which engine a table uses
SHOW TABLE STATUS WHERE Name = 'orders'\G
```

## Stage 8: Result Set Return

The execution engine assembles rows into a result set and streams them to the client through the network protocol. For large result sets, rows are sent as they are retrieved rather than buffering everything first.

## Summary

MySQL processes queries through connection handling, parsing, semantic validation, cost-based optimization, execution, and storage engine retrieval in sequence. The optimizer is the most consequential stage for performance - it decides which indexes to use and the join order. Use `EXPLAIN` and `EXPLAIN ANALYZE` to inspect the optimizer's choices and the actual execution timings at each stage.

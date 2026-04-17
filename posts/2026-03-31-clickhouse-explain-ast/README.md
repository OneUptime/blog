# How to Use EXPLAIN AST in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, EXPLAIN, AST, Query Analysis

Description: Learn how to use EXPLAIN AST in ClickHouse to inspect the abstract syntax tree of a query for debugging and deep analysis.

---

`EXPLAIN AST` in ClickHouse prints the abstract syntax tree (AST) of a SQL statement as ClickHouse parses it. The AST is the structured, tree-shaped representation of your query before any semantic analysis or optimization takes place. It is most useful when you need to understand exactly how ClickHouse has parsed a complex expression, debug a query that produces unexpected results, or verify that aliases and subqueries are structured as intended.

## Basic EXPLAIN AST Syntax

```sql
EXPLAIN AST
SELECT user_id, count() AS cnt
FROM events
WHERE event_date = '2024-06-01'
GROUP BY user_id;
```

Sample output:

```text
SelectWithUnionQuery (children 1)
 ExpressionList (children 1)
  SelectQuery (children 4)
   ExpressionList (children 2)
    Identifier user_id
    Function count (alias cnt) (children 1)
     ExpressionList
   TablesInSelectQuery (children 1)
    TablesInSelectQueryElement (children 1)
     TableExpression (children 1)
      TableIdentifier events
   Function equals (children 1)
    ExpressionList (children 2)
     Identifier event_date
     Literal '2024-06-01'
   ExpressionList (children 1)
    Identifier user_id
```

The tree mirrors the SQL structure. The top-level `SelectWithUnionQuery` wraps every query (because any SELECT could be part of a UNION), and the `SelectQuery` below it holds the projection list, the `TablesInSelectQuery` node, the WHERE expression, and the GROUP BY expression list as ordered children.

## Understanding AST Node Types

### Identifier Nodes

Identifier nodes represent column or table references before alias resolution. They appear as plain names with no transformation.

```sql
EXPLAIN AST
SELECT t.user_id, t.amount
FROM transactions AS t;
```

```text
SelectWithUnionQuery (children 1)
 ExpressionList (children 1)
  SelectQuery (children 2)
   ExpressionList (children 2)
    Identifier t.user_id
    Identifier t.amount
   TablesInSelectQuery (children 1)
    TablesInSelectQueryElement (children 1)
     TableExpression (children 1)
      TableIdentifier transactions (alias t)
```

### Function Nodes

Function nodes hold the function name and a child `arguments` list. Aggregate functions, arithmetic, and string functions all appear the same way.

```sql
EXPLAIN AST
SELECT toStartOfDay(event_time) AS day, sum(value) AS total
FROM metrics;
```

```text
SelectWithUnionQuery (children 1)
 ExpressionList (children 1)
  SelectQuery (children 2)
   ExpressionList (children 2)
    Function toStartOfDay (alias day) (children 1)
     ExpressionList (children 1)
      Identifier event_time
    Function sum (alias total) (children 1)
     ExpressionList (children 1)
      Identifier value
   TablesInSelectQuery (children 1)
    ...
```

### Subquery Nodes

Subqueries appear as nested `SelectQuery` nodes, making it easy to see how deeply they are nested.

```sql
EXPLAIN AST
SELECT user_id
FROM users
WHERE user_id IN (
    SELECT DISTINCT user_id
    FROM orders
    WHERE status = 'completed'
);
```

```text
SelectWithUnionQuery (children 1)
 ExpressionList (children 1)
  SelectQuery (children 3)
   ExpressionList (children 1)
    Identifier user_id
   TablesInSelectQuery (children 1)
    TablesInSelectQueryElement (children 1)
     TableExpression (children 1)
      TableIdentifier users
   Function in (children 1)
    ExpressionList (children 2)
     Identifier user_id
     SelectWithUnionQuery (children 1)
      ExpressionList (children 1)
       SelectQuery (children 3)
        ExpressionList (children 1)
         Identifier user_id
        TablesInSelectQuery
         ...
        Function equals (children 1)
         ExpressionList (children 2)
          Identifier status
          Literal 'completed'
```

The inner subquery is wrapped in its own `SelectWithUnionQuery` node inside the `in` function's argument list. Note that `DISTINCT` is not a separate node in the AST; it is stored as a flag on the `SelectQuery` itself and is therefore not shown as a child in the tree dump.

## Debugging Complex Expressions

### Alias Expansion Check

Use EXPLAIN AST to confirm that aliases are not prematurely expanded at parse time (ClickHouse preserves them in the AST):

```sql
EXPLAIN AST
SELECT
    event_date,
    count() AS cnt,
    cnt * 2 AS double_cnt
FROM events
GROUP BY event_date;
```

The AST will show `Identifier cnt` in the `double_cnt` expression, confirming the alias reference is preserved as-is at parse time. ClickHouse resolves it during semantic analysis, not during parsing.

### Verifying JOIN Condition Parsing

```sql
EXPLAIN AST
SELECT o.order_id, u.email
FROM orders AS o
INNER JOIN users AS u ON o.user_id = u.id
WHERE o.total > 100;
```

```text
SelectWithUnionQuery (children 1)
 ExpressionList (children 1)
  SelectQuery (children 3)
   ExpressionList (children 2)
    Identifier o.order_id
    Identifier u.email
   TablesInSelectQuery (children 2)
    TablesInSelectQueryElement (children 1)
     TableExpression (children 1)
      TableIdentifier orders (alias o)
    TablesInSelectQueryElement (children 2)
     TableJoin (children 1)
      Function equals (children 1)
       ExpressionList (children 2)
        Identifier o.user_id
        Identifier u.id
     TableExpression (children 1)
      TableIdentifier users (alias u)
   Function greater (children 1)
    ExpressionList (children 2)
     Identifier o.total
     Literal UInt64_100
```

The `TableJoin` node holds the ON expression, and the joined table appears as a sibling `TableExpression`. You can confirm the join condition and the right-hand table are parsed correctly before running the query. Join kind and strictness (for example `INNER`/`ALL`) are stored as attributes on the `TableJoin` node rather than as separate child nodes.

## Using EXPLAIN AST for DDL Statements

EXPLAIN AST works on DDL too, not just SELECT:

```sql
EXPLAIN AST
CREATE TABLE sensor_data
(
    sensor_id  UInt32,
    recorded_at DateTime,
    temperature Float32
)
ENGINE = MergeTree()
ORDER BY (sensor_id, recorded_at);
```

```text
CreateQuery sensor_data (children 2)
 Columns definition (children 1)
  ExpressionList (children 3)
   ColumnDeclaration sensor_id (children 1)
    Identifier UInt32
   ColumnDeclaration recorded_at (children 1)
    Identifier DateTime
   ColumnDeclaration temperature (children 1)
    Identifier Float32
 Storage definition (children 2)
  Identifier MergeTree
  Function tuple (children 1)
   ExpressionList (children 2)
    Identifier sensor_id
    Identifier recorded_at
```

This is useful for validating that your CREATE TABLE statement is parsed as expected before executing it in production.

## Summary

`EXPLAIN AST` shows the raw parsed representation of your SQL before any optimization or alias resolution. It is most valuable for debugging queries where you suspect a parsing issue, verifying join conditions and subquery structure, and inspecting DDL statements. Because the AST reflects the parser output directly, differences between what you wrote and what appears in the AST immediately highlight mismatches in how ClickHouse interprets your query.

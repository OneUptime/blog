# Validation Summary: How to Use EXPLAIN AST in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- `EXPLAIN AST` statement
- ClickHouse SQL parser / abstract syntax tree

## Sources Consulted
- [ClickHouse EXPLAIN Statement — Official Documentation](https://clickhouse.com/docs/en/sql-reference/statements/explain)
- [ClickHouse Docs Source — explain.md on GitHub](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/statements/explain.md)
- [Understanding query execution with the analyzer — ClickHouse Docs](https://clickhouse.com/docs/guides/developer/understanding-query-execution-with-the-analyzer)
- [Altinity Knowledge Base — EXPLAIN query](https://kb.altinity.com/altinity-kb-queries-and-syntax/explain-query/)

## Issues Found
All six sample AST outputs in the post used an invented, simplified tree format that did not match what ClickHouse actually prints. The real output uses a `SelectWithUnionQuery` wrapper, `ExpressionList` container nodes, `(children N)` child-count annotations, and `TableIdentifier` for table references. I rewrote every sample output to match the real format and reconciled the surrounding prose. Specific changes:

1. **Basic `EXPLAIN AST` sample output (section "Basic EXPLAIN AST Syntax"):** Replaced the invented `SelectQuery` / `select` / `tables` / `where` / `groupBy` labelling and `List` nodes with the real format — `SelectWithUnionQuery (children 1)` at the top, `ExpressionList` wrappers, `TablesInSelectQuery` → `TablesInSelectQueryElement` → `TableExpression` → `TableIdentifier`, and `(children N)` annotations. Also updated the explanatory sentence to describe the real structure.
2. **Identifier Nodes sample output:** Rewrote to include the `SelectWithUnionQuery`/`ExpressionList` wrappers and replaced `Identifier transactions` with `TableIdentifier transactions` (the correct node type for table names in ClickHouse's AST).
3. **Function Nodes sample output:** Rewrote to use `Function <name> (alias <name>) (children 1)` followed by an `ExpressionList` of arguments, matching the real `EXPLAIN AST` format instead of the fabricated `arguments` / `List` container.
4. **Subquery Nodes sample output:** Fixed two issues. First, rewrote the tree to match the real format. Second, removed `Function distinct ...` — `DISTINCT` is **not** a function in ClickHouse's AST; it is stored as a boolean flag on the `SelectQuery` node and does not appear as a child. Added a clarifying sentence.
5. **JOIN Condition Parsing sample output:** Rewrote using the real ClickHouse structure (`TablesInSelectQueryElement` with a `TableJoin` child that holds the ON expression, and a sibling `TableExpression` for the joined table). Removed the invented `JoinExpression`, `JoinKind INNER`, and `JoinStrictness ALL` child nodes — join kind and strictness are attributes on `TableJoin`, not separate tree nodes. Updated the following prose to match.
6. **DDL CREATE TABLE sample output:** Rewrote to the real format — `CreateQuery <name> (children 2)` with a `Columns definition` subtree (using `ColumnDeclaration` → `Identifier <type>`) and a `Storage definition` subtree. Removed the invented `DataType ...` nodes and the non-existent `StorageAST` node. The ORDER BY tuple is now shown as `Function tuple` under the storage definition, reflecting how the parser actually represents it.

## Review Notes
- The textual claims in the post remain accurate: `EXPLAIN AST` dumps the parser output before semantic analysis, aliases are preserved in the AST and only resolved later, and `EXPLAIN AST` works for all statement types including DDL (explicitly stated in the official docs).
- Exact `EXPLAIN AST` output can vary slightly between ClickHouse versions (notably around analyzer changes); the post does not pin a version. The rewritten samples reflect the format documented on current ClickHouse docs and observed in the referenced examples, but a reader on an older or bleeding-edge build might see small differences (for example, how literals are stamped with type names, or DISTINCT handling once the analyzer rewrites a query).
- `EXPLAIN AST` also accepts a `graph = 1` setting to emit the tree as DOT graph format; this is not mentioned in the post and could be a useful future addition, but adding it is out of scope for a correctness review.

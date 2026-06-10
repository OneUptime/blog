# Validation Summary: How to Create Vertical Partitioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQL (generic DDL)
- MySQL (inline `INDEX` syntax, `MEDIUMBLOB`, `JSON` columns)
- PostgreSQL (SERIAL, JSONB, PL/pgSQL stored functions)
- Apache Cassandra / CQL (column-family model, compression classes)
- Mermaid diagrams (graph LR, sequenceDiagram)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax (inline `INDEX` clauses, `MEDIUMBLOB`, `JSON`): https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- PostgreSQL Documentation — CREATE TABLE, JSONB, PL/pgSQL (`RETURNING ... INTO`, dollar-quoted bodies, `LANGUAGE plpgsql`): https://www.postgresql.org/docs/current/sql-createtable.html and https://www.postgresql.org/docs/current/plpgsql.html
- PostgreSQL Documentation — Table Inheritance (`INHERITS`): https://www.postgresql.org/docs/current/tutorial-inheritance.html and https://www.postgresql.org/docs/current/ddl-inherit.html (verified inheritance is associated with class hierarchies / legacy horizontal partitioning, not vertical partitioning)
- Apache Cassandra CQL Reference — CREATE TABLE, compression options (`LZ4Compressor`, `DeflateCompressor`), collection types: https://cassandra.apache.org/doc/latest/cassandra/cql/ddl.html
- Mermaid documentation — flowchart and sequence diagram syntax: https://mermaid.js.org/

## Issues Found
1. **Misleading claim about PostgreSQL table inheritance.** The original text stated: "PostgreSQL offers table inheritance as a native mechanism for implementing vertical partitioning patterns. This example demonstrates a complete implementation with insert triggers." Two problems:
   - PostgreSQL's table inheritance (`INHERITS` clause) is typically used for OO class hierarchies and was historically the basis for *horizontal* partitioning (before PG 10 declarative partitioning) — it is not a mechanism for vertical partitioning. The code example doesn't actually use `INHERITS`; it uses standard foreign key `REFERENCES`.
   - The code shows a stored function, not "insert triggers" (no `CREATE TRIGGER` is present).

   **Fix:** Rewrote the introductory sentence to accurately describe what the example demonstrates: PostgreSQL is well suited to vertical partitioning thanks to JSONB columns, referential integrity, and PL/pgSQL helper functions, with a stored procedure that inserts across partitions atomically.

## Review Notes
- The MySQL example uses inline `INDEX idx_name (col)` syntax inside `CREATE TABLE`, which is MySQL-specific but valid (would not work in PostgreSQL). The post does not explicitly label this as MySQL, though `MEDIUMBLOB` and `JSON` give it away. Acceptable as-is.
- The "column families" terminology for Cassandra is somewhat dated (CQL has used "tables" since Cassandra 3.x), but the underlying storage-engine concept is still relevant and the CQL itself is syntactically correct.
- The performance numbers in the comparison table are presented as hypothetical/illustrative benchmarks. The internal math (e.g., 45→12ms ≈ 73% faster, 35→52ms ≈ 48% slower) checks out, and the directional outcomes (narrow-column reads faster, JOINs and multi-partition inserts slower) are technically plausible.
- The PL/pgSQL function does not run inside an explicit transaction wrapper. Callers should be aware that if they invoke it outside a transaction, individual `INSERT`s can still fail independently in some failure modes (e.g., constraint violations partway through). This is out of scope for a tutorial post, but worth noting.

# Join Kuzu Graph Matches with Attached PostgreSQL Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, PostgreSQL, Cypher, Graph Database, Data Analysis

Description: Combine PostgreSQL rows with Kuzu graph patterns using explicit join keys, remote filtering, and cardinality checks.

An embedded graph can hold relationships while PostgreSQL remains the source of account status, pricing, or other frequently updated attributes. Kuzu's PostgreSQL extension lets a query scan those relational rows and match them to local graph nodes.

The two datasets need a shared key. A matching display name is rarely enough. This guide targets Kuzu 0.11.3 and shows a join between PostgreSQL account flags and a local graph of account-to-project assignments.

## Prepare the connection and extension

Provision the 0.11.3 PostgreSQL extension for your platform through a controlled extension server, then load and attach it:

```cypher
INSTALL postgres FROM 'http://localhost:8080/';
LOAD EXTENSION postgres;
ATTACH 'dbname=graph_source host=localhost port=5432 user=graph_reader'
AS pg (dbtype postgres);
```

The server URL is an example local extension repository. PostgreSQL is not bundled with Kuzu 0.11.3, and the former public extension service should not be assumed available after the archive. Supply authentication through your deployment's approved mechanism rather than placing passwords in a tutorial script.

The [connector source](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/src/connector/postgres_connector.cpp) also installs and loads the PostgreSQL extension inside embedded DuckDB. Provision compatible cached DuckDB extension artifacts or permit its extension-repository access as well. Hosting only the Kuzu extension does not establish an offline deployment.

The [PostgreSQL extension documentation](https://kuzudb.github.io/docs/extensions/attach/postgres/) covers attachment, type mapping, table scans, and `SQL_QUERY`. A schema other than `public` must be selected deliberately when attaching.

## Define the two sides

The local Kuzu graph uses:

```cypher
CREATE NODE TABLE Account(id INT64 PRIMARY KEY, name STRING);
CREATE NODE TABLE Project(id INT64 PRIMARY KEY, title STRING);
CREATE REL TABLE AssignedTo(FROM Account TO Project);
CREATE (:Account {id: 1, name: 'Ada'});
CREATE (:Account {id: 2, name: 'Ben'});
CREATE (:Project {id: 10, title: 'Migration'});
MATCH (a:Account), (p:Project {id: 10})
CREATE (a)-[:AssignedTo]->(p);
```

In PostgreSQL, the status table has one row per account:

```sql
CREATE TABLE account_flags(
    account_id bigint PRIMARY KEY,
    tier text,
    enabled boolean
);
INSERT INTO account_flags VALUES
    (1, 'priority', true),
    (2, 'standard', false);
```

Run that SQL in PostgreSQL. The shared key is `account_flags.account_id = Account.id`. A primary key on the relational side makes the join's expected cardinality clear.

## Scan relational rows and match the graph

```cypher
LOAD FROM pg.account_flags
WITH account_id, tier, enabled
MATCH (account:Account)-[:AssignedTo]->(project:Project)
WHERE account.id = account_id AND enabled = true
RETURN account.id AS account_id, tier, project.id AS project_id
ORDER BY account_id, project_id;
```

The `WITH` projection makes the imported columns explicit before graph matching. The equality predicate is the join condition. Without it, relational rows and graph matches can form a Cartesian product.

The fixture returns account one and project ten. It is an inner join: a relational row without a local account disappears, and a local account without a flag row cannot enter through this scan. Use that behavior intentionally.

If the graph contains several `AssignedTo` relationships for the same pair, each matching relationship can produce a row. Return distinct endpoint pairs only when duplicates have no business meaning. Do not blindly add `DISTINCT` to suppress an unexpected fan-out; inspect which side is multiplying rows.

## Push deliberate filtering into SQL_QUERY

For a large remote table, make PostgreSQL perform a known filter and projection:

```cypher
CALL SQL_QUERY('pg',
    'SELECT account_id, tier FROM account_flags WHERE enabled = true')
WITH account_id, tier
MATCH (account:Account)-[:AssignedTo]->(project:Project)
WHERE account.id = account_id
RETURN account.id AS account_id, tier, project.id AS project_id
ORDER BY account_id, project_id;
```

This makes the remote SQL work visible. A filter written after `LOAD FROM` should not be assumed to be pushed into PostgreSQL in every plan. Measure the amount of data transferred and inspect both the Kuzu plan and the PostgreSQL query plan when tuning.

`SQL_QUERY` executes read-only SQL. It is not a mechanism for arbitrary PostgreSQL writes or a replacement for its native client. The SQL text is another query-language boundary: do not concatenate untrusted user input into it. Prefer fixed queries, controlled projections, or a separately parameterized PostgreSQL extraction path for dynamic values.

## Handle missing rows as a business choice

Starting from remote rows is useful when PostgreSQL defines the eligible account set. If Kuzu defines the reporting population and missing flags must remain visible, start from a graph export and enrich it in application code, or use a tested optional-join query for the precise API shape you need.

A missing row should not silently become `enabled=true`. Decide whether it means unknown, disabled, or inconsistent source data. Report it separately when the distinction matters.

For historical reporting, live enrichment can be misleading. A graph batch from last month joined to today's flags represents two different points in time. Include source timestamps or export versions, or materialize the required relational snapshot together with the graph batch.

## Understand the operational boundary

An attached query depends on PostgreSQL availability and remote query latency. A fast local graph traversal cannot compensate for a slow remote scan. Record remote failures separately from local graph errors so incidents can be diagnosed at the right layer.

The join is not a distributed transaction. A local read transaction does not guarantee a single atomic snapshot spanning PostgreSQL and Kuzu. If strict cross-system consistency is required, import a stable relational extract and query it locally, or design a versioned synchronization contract.

Check schema changes too. The extension caches remote schema information; use its documented cache-clearing or reattachment process after a PostgreSQL schema migration rather than assuming a long-lived attachment immediately reflects changed columns.

## Conclusion

Join attached PostgreSQL rows to graph matches through explicit business keys and projections. Control remote filtering deliberately, verify fan-out and missing-row behavior, and document the availability and consistency boundary introduced by live enrichment.

## Official Documentation

- [PostgreSQL attachment and SQL_QUERY](https://kuzudb.github.io/docs/extensions/attach/postgres/)
- [LOAD FROM](https://kuzudb.github.io/docs/cypher/query-clauses/load-from/)
- [WITH](https://kuzudb.github.io/docs/cypher/query-clauses/with/)
- [SQL_QUERY implementation tests](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/test/test_files/sql_query.test)

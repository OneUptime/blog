# Choose a Kuzu Ingestion Path for Millions of Nodes and Edges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph Database, Cypher, Data Import, ETL, Performance

Description: Choose the right Kuzu ingestion primitive for bulk loads, one-off inserts, and idempotent updates without turning a million-row import into a query loop.

---

For Kuzu, the practical dividing line is simple: use `COPY FROM` to build or append large tables, `CREATE` for known-new records arriving occasionally, and `MERGE` when a small write must match-or-create. Kuzu's archived import guide explicitly positions `CREATE` and `MERGE` for graphs of a few thousand nodes and `COPY FROM` for millions of nodes and beyond.

That guidance matters even more now that Kuzu is frozen at 0.11.3. With Kuzu's repository archived and read-only, applications should not expect a later Kuzu optimizer release to rescue a design that sends millions of individual Cypher writes. Make ingestion architecture explicit, pin the Kuzu version, and validate the exact workflow against a copy of the production schema. LadybugDB, the maintained successor, preserves the same broad recommendation, but this article uses Kuzu 0.11.3 names and paths.

## The Decision in One Table

| Path | Best use | Duplicate behavior | Scaling shape |
| --- | --- | --- | --- |
| `COPY FROM` | Initial loads, rebuilds, large append batches | Primary-key violations fail unless supported errors are ignored | Bulk insertion pipeline; parallel source reads where supported |
| `CREATE` | A small number of records known to be new | A duplicate node primary key is an error | Per-input-tuple Cypher mutation; not bulk-optimized |
| `MERGE` | Sparse idempotent writes or upserts | Matches the whole supplied pattern or creates it | Pays matching and mutation cost per operation |

Do not interpret this as a row-count law. A 5,000-row maintenance job may still be easier with `COPY FROM`; a single user registration should not require generating a file. The important distinction is whether the work is a bulk data movement job or an online graph mutation.

## Start With a Typed Schema

Kuzu's default graph model is structured. Define node tables, their primary keys, relationship endpoints, and property types before loading data:

~~~cypher
CREATE NODE TABLE Account(
    account_id STRING PRIMARY KEY,
    display_name STRING,
    created_at TIMESTAMP
);

CREATE NODE TABLE Project(
    project_id STRING PRIMARY KEY,
    name STRING
);

CREATE REL TABLE MEMBER_OF(
    FROM Account TO Project,
    role STRING,
    joined_at TIMESTAMP
);
~~~

The schema is not paperwork around the import. It determines how source columns are cast, how relationship endpoint keys are resolved, and which node property gets a primary-key index. Validate the source types before measuring ingestion speed; a fast load that maps IDs incorrectly is just fast corruption.

## Use `COPY FROM` for the Large Path

Assume `accounts.parquet`, `projects.parquet`, and `memberships.parquet` have columns in the same order as their target tables. Import nodes before relationships:

~~~cypher
COPY Account FROM 'staging/accounts.parquet';
COPY Project FROM 'staging/projects.parquet';
COPY MEMBER_OF FROM 'staging/memberships.parquet';
~~~

Relationship source rows identify their `FROM` and `TO` nodes through the corresponding primary-key values. Those nodes therefore must already exist. Loading relationships first is not an optimization; it is an invalid dependency order.

Parquet is attractive for a controlled pipeline because its metadata carries types. CSV remains useful, but pin options when ambiguity would be dangerous:

~~~cypher
COPY Account FROM 'staging/accounts-*.csv' (
    HEADER=true,
    DELIM=',',
    AUTO_DETECT=false,
    PARALLEL=true
);
~~~

Kuzu can read a glob or an explicit list of files into one table. That lets upstream ETL produce manageable shards without forcing the application to loop over rows. It is still one bulk statement from Kuzu's perspective.

When input has fewer columns than the target, name the destination columns:

~~~cypher
COPY Account(account_id, display_name)
FROM 'staging/accounts-without-timestamps.parquet';
~~~

Unfilled properties receive their defaults, or `NULL` when no default exists. If transformations are needed, `COPY FROM` can consume a `LOAD FROM` subquery rather than requiring per-row Cypher:

~~~cypher
COPY Account FROM (
    LOAD FROM 'staging/raw-accounts.parquet'
    WHERE disabled = false
    RETURN id, trim(name), created_at
);
~~~

This keeps scanning, filtering, and insertion inside a bulk pipeline.

## `CREATE` Is the Direct Insert

For a known-new online record, parameterized `CREATE` is clear and inexpensive at human transaction rates:

~~~python
conn.execute(
    """
    CREATE (a:Account {
        account_id: $account_id,
        display_name: $display_name,
        created_at: $created_at
    })
    """,
    {
        "account_id": "acct_2048",
        "display_name": "Ada",
        "created_at": created_at,
    },
)
~~~

Use parameters for values; do not assemble user input into Cypher text. `CREATE` does not check whether the whole pattern already exists. For node tables, the primary-key constraint still rejects a duplicate key. That is useful when duplication indicates an application bug.

Creating a relationship normally begins by matching its endpoints:

~~~cypher
MATCH (a:Account), (p:Project)
WHERE a.account_id = $account_id
  AND p.project_id = $project_id
CREATE (a)-[:MEMBER_OF {role: $role, joined_at: $joined_at}]->(p);
~~~

This is a good online write. Repeating it millions of times is not a bulk loader: every execution crosses the client boundary, binds a query, performs lookups, mutates storage, and completes transaction work.

## `MERGE` Is Match-or-Create, Not Bulk Magic

`MERGE` tries to match the supplied pattern; if the pattern is absent, it creates it. Kuzu does not partially match a complex pattern and create only the missing fragment. That all-or-nothing pattern semantic is why it is safer to match endpoints first and merge only the relationship:

~~~cypher
MATCH (a:Account), (p:Project)
WHERE a.account_id = $account_id
  AND p.project_id = $project_id
MERGE (a)-[m:MEMBER_OF]->(p)
ON CREATE SET m.role = $role, m.joined_at = $joined_at
ON MATCH SET m.role = $role;
~~~

Kuzu relationship tables have no user-defined primary key and allow parallel relationships by default. This `MERGE` avoids creating another edge once the endpoint-pair pattern matches, but it does not deduplicate existing parallel edges; `ON MATCH SET` applies to every matching edge.

For a node upsert, match on the stable identity and set mutable fields separately:

~~~cypher
MERGE (a:Account {account_id: $account_id})
ON CREATE SET a.created_at = $created_at,
              a.display_name = $display_name
ON MATCH SET a.display_name = $display_name;
~~~

Avoid putting mutable properties into the identifying map unless their values are truly part of identity. If `display_name` is included and later changes, the complete pattern no longer matches; the attempted create then collides with the existing primary key.

`MERGE` makes retries easier, but it does not make a million calls cheap. If the source is a large snapshot or change file, deduplicate it upstream, bulk-load into the intended target or a separately built database, validate, and then cut over using the deployment mechanism appropriate for the application.

## Validate the Load, Not Just the Exit Code

At minimum, record source counts and graph counts:

~~~cypher
MATCH (a:Account) RETURN count(*) AS accounts;
MATCH (p:Project) RETURN count(*) AS projects;
MATCH (:Account)-[m:MEMBER_OF]->(:Project)
RETURN count(*) AS memberships;
~~~

Also check uniqueness at the source, null endpoint IDs, relationships whose endpoints are absent, representative property values, and application-critical traversals. For CSV, leave `IGNORE_ERRORS=false` during a controlled migration. If the business explicitly accepts skipped rows, enable it deliberately and inspect `CALL show_warnings() RETURN *`; otherwise a green import can conceal missing graph records.

Benchmark end to end. Include parsing, relationship construction, checkpointing, validation queries, and peak memory or temporary-disk use. Compare `COPY FROM` formats and shard layouts, not `COPY FROM` against an intentionally inefficient million-iteration Python loop.

## A Production Ingestion Pattern

A reliable pipeline usually looks like this:

1. Normalize source IDs and types outside Kuzu.
2. Reject or quarantine null and duplicate node primary keys.
3. Verify every relationship endpoint exists in the node datasets.
4. Create the schema in a fresh, version-pinned database.
5. `COPY` all node tables, then relationship tables.
6. Run counts, invariants, and representative queries.
7. Publish the validated database artifact or perform the planned cutover.
8. Reserve parameterized `CREATE` and `MERGE` for the small online delta afterward.

This separates reproducible bulk construction from latency-sensitive mutations and gives failures a clean rollback boundary.

## Official Documentation

- [Kuzu 0.11.3 release and archive status](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu import overview](https://kuzudb.github.io/docs/import/)
- [Kuzu CSV import](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu Parquet import](https://kuzudb.github.io/docs/import/parquet/)
- [Kuzu `COPY FROM` a subquery](https://kuzudb.github.io/docs/import/copy-from-subquery/)
- [Kuzu `CREATE` clause](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/create/)
- [Kuzu `MERGE` clause](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/merge/)
- [LadybugDB maintained import guidance](https://docs.ladybugdb.com/import/)

## Conclusion

Choose by workload shape. `COPY FROM` is Kuzu's bulk path and should own million-record construction. `CREATE` is the honest primitive for a small, definitely-new write. `MERGE` adds match-or-create behavior for sparse, retryable changes, but its lookup work is not a substitute for bulk loading. Keep identities stable, import nodes before edges, parameterize online writes, and validate graph invariants before cutover.

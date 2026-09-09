# Import PostgreSQL Join Results as Kuzu Nodes and Relationships

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, PostgreSQL, Data Import, Cypher, Graph Database

Description: Use PostgreSQL read-only SQL queries as Kuzu import sources, project graph identities explicitly, and load endpoint nodes before relationships.

A PostgreSQL join can be a useful source for a graph import, but each joined row is not automatically a new node. Repeated account or project values often describe the same entity, while an assignment row describes a relationship between two entities.

The import must separate those roles. Project unique node records first, then project relationship endpoints and properties. This guide targets Kuzu 0.11.3 and its PostgreSQL extension.

## Provision the extension explicitly

Kuzu's upstream project is archived. Version 0.11.3 bundles several extensions, but PostgreSQL is not one of them. Provision a compatible `postgres` extension from your controlled local extension server and load it:

```cypher
INSTALL postgres FROM 'http://localhost:8080/';
LOAD EXTENSION postgres;
```

The URL is an example of a local server already populated with matching release and platform artifacts. It is not a public Kuzu service. Follow the [upstream extension-server instructions](https://github.com/kuzudb/kuzu#extensions) when preparing the artifacts.

Attach a PostgreSQL database using a service account permitted to read the export tables. In a local fixture where authentication is configured outside the statement:

```cypher
ATTACH 'dbname=graph_source host=localhost port=5432 user=graph_reader'
AS pg (dbtype postgres);
```

The [PostgreSQL connector source](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/src/connector/postgres_connector.cpp) also creates an embedded DuckDB connection and installs/loads its `postgres` extension. Provide compatible cached DuckDB artifacts or access to its extension repository; a local Kuzu extension server alone does not make attachment work offline.

Keep real credentials out of saved Cypher files and shell history. Verify the PostgreSQL-to-Kuzu type mapping for your actual columns, especially timestamps, decimals, arrays, and unsupported types.

## Define the source model

The source PostgreSQL schema might be:

```sql
CREATE TABLE account(id bigint PRIMARY KEY, name text);
CREATE TABLE project(id bigint PRIMARY KEY, title text);
CREATE TABLE assignment(
    account_id bigint REFERENCES account(id),
    project_id bigint REFERENCES project(id),
    role text,
    PRIMARY KEY(account_id, project_id)
);
INSERT INTO account VALUES (1, 'Ada'), (2, 'Ben');
INSERT INTO project VALUES (10, 'Migration');
INSERT INTO assignment VALUES (1, 10, 'owner'), (2, 10, 'reviewer');
```

Run that fixture in PostgreSQL, not through Kuzu's read-only SQL scan function. The assignment primary key makes one relationship per account/project pair the source contract. If your real schema permits several assignments per pair, decide whether they remain parallel edges or need an assignment node with its own identity.

The example imports only accounts and projects that participate in assignments. If the graph must include isolated accounts or projects, read those node tables directly instead of deriving them from an inner join.

## Create the graph schema

```cypher
CREATE NODE TABLE Account(id INT64 PRIMARY KEY, name STRING);
CREATE NODE TABLE Project(id INT64 PRIMARY KEY, title STRING);
CREATE REL TABLE AssignedTo(FROM Account TO Project, role STRING);
```

PostgreSQL `bigint` maps to Kuzu `INT64`. Explicitly cast source IDs to `bigint` if the source query computes an expression whose inferred type differs. Keep identity columns stable across all three imports.

The [PostgreSQL extension reference](https://kuzudb.github.io/docs/extensions/attach/postgres/) documents `SQL_QUERY` for read-only remote SQL. Kuzu's source tests also exercise SQL joins and copying their results through a subquery.

## Import node projections, then edges

```cypher
COPY Account FROM (
    CALL SQL_QUERY('pg',
        'SELECT DISTINCT a.id, a.name FROM account a JOIN assignment x ON x.account_id = a.id')
    RETURN id, name
);
COPY Project FROM (
    CALL SQL_QUERY('pg',
        'SELECT DISTINCT p.id, p.title FROM project p JOIN assignment x ON x.project_id = p.id')
    RETURN id, title
);
COPY AssignedTo FROM (
    CALL SQL_QUERY('pg',
        'SELECT a.id AS source_id, p.id AS destination_id, x.role FROM assignment x JOIN account a ON a.id = x.account_id JOIN project p ON p.id = x.project_id')
    RETURN source_id, destination_id, role
);
```

The first two queries remove join-generated duplicate node rows. The relationship projection puts the source key first, destination key second, then `role`, matching the graph schema's input layout.

Use explicit columns instead of `SELECT *`. Adding a PostgreSQL column should not silently change the number or order of fields fed to Kuzu. Alias potentially colliding join columns so the result has unambiguous names.

Do not use `DISTINCT` to hide inconsistent node attributes. If one ID appears with two different names in a denormalized source, both projected rows can remain distinct and conflict at import. Resolve the source-of-truth rule before loading.

## Preserve source consistency

The three SQL scans are separate remote operations. A Kuzu transaction can make local writes atomic, but it does not establish a distributed PostgreSQL snapshot for those scans. A source update between scans can make the relationship set disagree with the node set.

For a consistent batch, create immutable export tables from one PostgreSQL snapshot, pause changes to a controlled fixture, or export one stable source batch through the PostgreSQL client first. Then load all local tables from that frozen batch under a Kuzu transaction where appropriate.

Also define refresh behavior. `COPY` into existing node tables is not a generic upsert, and copying relationship rows again can create duplicates. For reproducible rebuilds, load a fresh graph database or implement a deliberate merge and deletion strategy.

## Validate the mapping

The fixture should produce two accounts, one project, and two relationships. Verify the actual assignments:

```cypher
MATCH (a:Account)-[x:AssignedTo]->(p:Project)
RETURN a.id, p.id, x.role
ORDER BY a.id, p.id;
```

Compare both counts and endpoint/property tuples with the frozen PostgreSQL extract. Check null identities, missing endpoints, and source duplicates before treating the batch as complete.

## Conclusion

Treat a PostgreSQL join as a source relation, then explicitly project graph nodes and relationship rows. Load endpoints first, preserve type and column order, and freeze the source batch when the import must represent one consistent point in time.

## Official Documentation

- [PostgreSQL extension](https://kuzudb.github.io/docs/extensions/attach/postgres/)
- [Copy from subquery](https://kuzudb.github.io/docs/import/copy-from-subquery/)
- [Official SQL join and copy tests](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/test/test_files/sql_query.test)
- [Extension provisioning](https://github.com/kuzudb/kuzu#extensions)

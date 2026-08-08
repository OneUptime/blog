# Gel vs PostgreSQL: When Is the Higher-Level Model Worth It?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, PostgreSQL, Data Modeling, EdgeQL, Architecture

Description: A practical framework for deciding whether Gel's object model and EdgeQL justify adding a database front end above PostgreSQL.

---

Gel is not a document database competing with an unrelated PostgreSQL engine. It is a graph-relational database built on PostgreSQL that replaces much of the database front end: schema modeling, EdgeQL compilation, migrations, client protocols, code generation, and object-level access policies.

The decision is therefore not simply which storage engine is faster. It is whether Gel's higher-level contract removes enough application and schema plumbing to justify a distinct operational and tooling layer.

## Compare the Abstractions, Not Just the Storage

In PostgreSQL, an application normally models entities with tables, relationships with foreign keys and join tables, and nested API output with joins, subqueries, aggregates, JSON construction, or ORM mapping.

Gel exposes object types with scalar properties and typed links:

```gel
type User {
  required email: str {
    constraint exclusive;
  };
  multi posts := .<author[is Post];
}

type Post {
  required title: str;
  required author: User;
  multi tags: Tag;
}

type Tag {
  required name: str {
    constraint exclusive;
  };
}
```

Every object automatically has a required, globally unique, read-only UUID `id`. The schema records whether each property or link is optional, required, single, or multi. That cardinality participates in query checking and generated client types rather than living only in application conventions.

The equivalent PostgreSQL model is perfectly reasonable, but it is expressed through several tables and constraints:

```sql
CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE
);

CREATE TABLE post (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  author_id uuid NOT NULL REFERENCES app_user(id)
);

CREATE TABLE tag (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE post_tag (
  post_id uuid NOT NULL REFERENCES post(id),
  tag_id uuid NOT NULL REFERENCES tag(id),
  PRIMARY KEY (post_id, tag_id)
);
```

Gel does not make those relational structures disappear. It gives them a first-class object and link vocabulary and compiles queries to PostgreSQL operations.

## Where Gel Usually Earns Its Keep

### Relationship-heavy application data

EdgeQL paths and shapes make nested retrieval explicit:

```edgeql
select Post {
  id,
  title,
  author: {
    id,
    email
  },
  tags: {
    name
  }
}
filter .author.id = <uuid>$author_id
order by .title;
```

The result already follows the requested shape. Applications avoid manually deduplicating joined rows or maintaining a second mapping layer just to reconstruct nested objects.

### One schema contract across several clients

Gel's schema, migration engine, EdgeQL type system, and official clients understand the same cardinalities. Code generation can derive typed query functions or a TypeScript query builder from that contract. This is valuable when schema drift and hand-maintained response types cause recurring defects.

### Database-enforced object visibility

Access policies can restrict select, insert, update, and delete operations at the object level, often using request context supplied through globals. These policies apply inside the database, so a forgotten filter in one endpoint does not automatically become a cross-tenant disclosure.

### Teams tired of ORM impedance work

Gel's object types, links, shapes, computed fields, constraints, and migrations are one integrated system. If a team repeatedly writes custom ORM loaders, nested serializers, and migration glue, the integrated layer can reduce total code even though it introduces a new query language.

## Where Direct PostgreSQL Is Usually the Better Fit

### The PostgreSQL ecosystem is the requirement

Choose PostgreSQL directly when the system depends on arbitrary PostgreSQL extensions, replication tooling, foreign data wrappers, administration extensions, vendor-specific managed features, or SQL tools that expect full control of the PostgreSQL catalog. Gel 6 added first-class PostGIS support and a PostgreSQL-compatible SQL interface, but that does not mean every PostgreSQL extension or every administration command is available through Gel.

### SQL is already the team's shared interface

Experienced SQL teams with disciplined migrations, generated types, and a small amount of mapping code may gain less from another abstraction. PostgreSQL's query language and operational behavior are broadly understood, and most cloud, analytics, backup, and observability products integrate with it directly.

### The workload is relational reporting or data integration

Wide analytical scans, ad hoc BI, ETL staging, and integration databases are often best served by conventional SQL schemas and tools. Gel can expose a SQL interface, but its strongest value is application-oriented modeling and querying rather than replacing the entire PostgreSQL data ecosystem.

### You need the smallest operational surface

A self-hosted Gel service adds its own server, compiler behavior, client protocol, migrations, version lifecycle, and health signals around PostgreSQL. If the application does not use the higher-level features, operating that layer is cost without corresponding leverage.

## Do Not Use the SQL Adapter as an Escape Hatch

Gel 6 introduced PostgreSQL protocol support and a subset of data modification through SQL. That is useful for supported SQL clients and gradual integration. It does not turn a Gel-managed database into an ordinary schema that every PostgreSQL administration tool may mutate safely.

Gel's documentation says the database schema is managed through Gel SDL, and the SQL adapter lists unsupported DDL and administration operations. Keep schema evolution in Gel migrations. Direct catalog or table changes can violate assumptions held by the Gel compiler and migration history.

## Evaluate With a Representative Slice

Avoid deciding from a one-table tutorial. Build a vertical slice containing:

- a one-to-many and a many-to-many relationship;
- one optional field and one required multi link;
- a nested read with filters and pagination;
- a transactional write that changes links;
- one schema change involving existing data;
- authorization for at least two tenants;
- generated client types and an application build;
- backup, restore, upgrade, metrics, and readiness checks.

Measure more than query latency. Count handwritten mapping code, authorization filters, schema-to-client type duplication, migration review effort, operational runbooks, and the number of skills required for on-call recovery.

## A Decision Matrix

| Requirement | Lean toward Gel | Lean toward PostgreSQL |
| --- | --- | --- |
| Deeply linked application objects | Typed links and nested shapes are central | Joins and mapping are already controlled |
| End-to-end cardinality | Schema and generated clients should share it | Application types already enforce it |
| Authorization | Object policies reduce endpoint risk | Existing RLS or service authorization is mature |
| Extension ecosystem | Only supported Gel extensions are needed | Arbitrary PostgreSQL extensions are essential |
| Data tooling | EdgeQL-first application workflow | SQL, BI, ETL, and admin tools dominate |
| Operations | Team accepts a Gel server lifecycle | Minimal, familiar PostgreSQL surface is critical |
| Existing system | Greenfield or bounded service | Large established PostgreSQL schema and tooling |

The choice can be service-specific. A product can use Gel for a relationship-heavy transactional service while retaining PostgreSQL directly for analytics or integration workloads. Do not split a single consistency boundary merely to use both technologies, but do not force one data platform on unrelated workloads either.

## Official Documentation

- [Welcome to Gel](https://docs.geldata.com/)
- [Gel object types](https://docs.geldata.com/reference/datamodel/objects)
- [Gel schema and links](https://docs.geldata.com/learn/schema)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel SQL adapter](https://docs.geldata.com/reference/using/sql_adapter)
- [PostgreSQL table expressions and joins](https://www.postgresql.org/docs/current/queries-table-expressions.html)
- [PostgreSQL JSON functions](https://www.postgresql.org/docs/current/functions-json.html)

## Conclusion

Gel is worth the extra layer when its object model, links, shapes, cardinality checking, migrations, code generation, and policies remove recurring application complexity. PostgreSQL remains the stronger default when ecosystem compatibility, direct SQL control, established operations, or analytical tooling are the primary requirements. Prototype the hardest relationship and operational path, then choose based on total system complexity rather than syntax preference.

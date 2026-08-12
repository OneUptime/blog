# How Should You Model Node Tables, Relationship Tables, and Primary Keys in Kuzu?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph Data Modeling, Cypher, Primary Key, Schema Design

Description: Design a Kuzu schema with stable node identities, directed typed relationships, deliberate multiplicities, and import-friendly endpoint keys.

---

Kuzu uses a structured property graph. Before inserting data, you declare strongly typed node tables and relationship tables. Every node table requires a primary key; relationship tables connect declared source and destination node tables and receive internal relationship IDs rather than user-defined primary keys.

A good model makes identity stable, direction unambiguous, and cardinality explicit. A poor model stores changing display values as keys, turns every attribute into a node, or assumes relationships are unique merely because their endpoints match.

## Start with Entities, Not Query Syntax

Use node tables for things with an identity that matters independently: users, products, orders, services, incidents, or repositories. Use relationship tables for typed connections: a user `PLACED` an order, an order `CONTAINS` a product, or a service `DEPENDS_ON` another service.

For example:

~~~cypher
CREATE NODE TABLE User(
    user_id STRING PRIMARY KEY,
    email STRING,
    display_name STRING,
    created_at TIMESTAMP
);

CREATE NODE TABLE Product(
    product_id STRING PRIMARY KEY,
    sku STRING,
    name STRING,
    price_cents INT64
);

CREATE NODE TABLE Orders(
    order_id STRING PRIMARY KEY,
    placed_at TIMESTAMP,
    status STRING
);
~~~

The table name is the Cypher label. Kuzu permits a node or relationship to have one label, so decide which entity type owns the record. Keep frequently changing descriptive fields as properties, not identity.

`Order` may collide with a reserved word in query languages and tooling, so the example uses `Orders`. If a required identifier is reserved, Kuzu supports escaping, but ordinary non-reserved names are easier across migration targets.

## Choose a Stable Node Primary Key

Kuzu requires one primary-key property per node table and automatically builds a primary-key index for fast lookup. The documented key types include `STRING`, numeric types, `DATE`, and `BLOB`; `SERIAL` provides auto-incremented integer values.

Choose a key that is:

- unique for the lifetime of the entity;
- non-null and always available during import;
- stable across source-system edits;
- compact enough to copy into relationship import files;
- portable to likely migration targets;
- safe to expose at the application's intended boundary.

An immutable source UUID represented consistently is usually better than an email address, mutable slug, product name, or array position. A natural key is fine when the business truly guarantees its stability. Document that guarantee rather than inferring it from today's sample.

Avoid this:

~~~cypher
CREATE NODE TABLE User(
    email STRING PRIMARY KEY,
    display_name STRING
);
~~~

if users can change email or two identity providers can represent the same person differently. Prefer:

~~~cypher
CREATE NODE TABLE User(
    user_id STRING PRIMARY KEY,
    email STRING,
    display_name STRING
);
~~~

Kuzu's primary-key index does not make every other property searchable through a general secondary index. Model identity for correctness; then measure query patterns and use graph structure or supported extension indexes where appropriate.

## Use `SERIAL` Deliberately

`SERIAL` can generate an integer primary key:

~~~cypher
CREATE NODE TABLE ImportBatch(
    batch_id SERIAL PRIMARY KEY,
    source STRING,
    started_at TIMESTAMP
);
~~~

It is convenient for locally created records that never need a preexisting external identity. It is less convenient when relationships arrive in separate files before generated IDs are known, when two databases must merge data, or when exports must reconcile with a source system.

If the source already has a durable key, store that as the primary key. If you use `SERIAL`, retain any external identifier as a separate property and enforce source-level uniqueness in the ingestion pipeline where the database schema does not provide that additional constraint.

## Relationship Tables Declare Valid Endpoints

Define direction and endpoint types in the schema:

~~~cypher
CREATE REL TABLE PLACED(
    FROM User TO Orders,
    channel STRING
);

CREATE REL TABLE CONTAINS(
    FROM Orders TO Product,
    quantity INT64,
    unit_price_cents INT64
);

CREATE REL TABLE FOLLOWS(
    FROM User TO User,
    followed_at TIMESTAMP
);
~~~

Direction should read naturally: `(user)-[:PLACED]->(order)` and `(order)-[:CONTAINS]->(product)`. Kuzu's relationship records have a source and destination and can carry properties. Put facts about the connection-quantity, role, timestamp, confidence, or source-on the relationship when they do not describe either endpoint alone.

Do not duplicate endpoint IDs as ordinary relationship properties merely to make them visible. The graph already binds endpoints; return their primary-key properties in queries.

## Relationship IDs Are Internal

Kuzu does not let you declare a relationship primary key. It assigns a unique internal relationship ID, and `ID(r)` can distinguish two relationship records. By default, multiple relationships can exist between the same endpoints.

That is useful for events such as repeated transfers or purchases:

~~~cypher
CREATE NODE TABLE Account(
    account_id STRING PRIMARY KEY
);

CREATE REL TABLE TRANSFERRED(
    FROM Account TO Account,
    transfer_id STRING,
    amount_cents INT64,
    occurred_at TIMESTAMP
);
~~~

However, `transfer_id` is not a relationship-table primary key. If duplicate transfer IDs would be financially incorrect, enforce uniqueness before inserting or model each transfer as a node with its own primary key:

~~~cypher
CREATE NODE TABLE Transfer(
    transfer_id STRING PRIMARY KEY,
    amount_cents INT64,
    occurred_at TIMESTAMP
);

CREATE REL TABLE SENT(FROM Account TO Transfer);
CREATE REL TABLE RECEIVED_BY(FROM Transfer TO Account);
~~~

Promoting the event to a node makes it independently addressable, lets other facts connect to it, and uses Kuzu's node-key constraint for uniqueness. It costs an extra hop, so use it when event identity has real value.

## Encode At-Most-One Multiplicity When It Is True

Relationship tables default to `MANY_MANY`. `MANY_ONE`, `ONE_MANY`, and `ONE_ONE` constrain one or both directions to at most one.

For example, if the current domain says a user can have at most one home city:

~~~cypher
CREATE NODE TABLE City(
    city_id STRING PRIMARY KEY,
    name STRING
);

CREATE REL TABLE LIVES_IN(
    FROM User TO City,
    since DATE,
    MANY_ONE
);
~~~

`MANY_ONE` means many users may point to a city, while each user has at most one outgoing `LIVES_IN` relationship. Kuzu's documentation warns that these constraints are “at most one,” not “exactly one.” A user with no city still satisfies the schema. Enforce required existence in ingestion or application validation.

Do not add `MANY_ONE` simply because a sample currently has one row per user. Ask whether history, multiple roles, shared ownership, or future requirements make multiples valid.

## One Relationship Name Can Cover Several Endpoint Pairs

Modern Kuzu syntax allows multiple `FROM ... TO ...` pairs on a relationship table:

~~~cypher
CREATE NODE TABLE Tag(
    tag_id STRING PRIMARY KEY
);

CREATE REL TABLE TAGGED(
    FROM User TO Tag,
    FROM Product TO Tag,
    tagged_at TIMESTAMP
);
~~~

This lets queries use one relationship label across supported entity types. Use it when the relationship semantics and properties truly match. Separate tables such as `USER_TAGGED` and `PRODUCT_TAGGED` are clearer when cardinality, authorization, lifecycle, or properties differ.

The older `CREATE REL TABLE GROUP` form is deprecated; prefer multiple endpoint pairs in one `CREATE REL TABLE` when a shared label is appropriate.

## Design for Bulk Import

For CSV `COPY FROM`, load node tables before relationship tables. For a relationship table with one endpoint pair, Kuzu interprets the first two relationship-file columns as the primary keys of the `FROM` and `TO` nodes; the remaining columns map to relationship properties. Load a table with multiple endpoint pairs one pair at a time by specifying `FROM='...'` and `TO='...'` options on each `COPY`.

Given:

~~~cypher
CREATE REL TABLE CONTAINS(
    FROM Orders TO Product,
    quantity INT64,
    unit_price_cents INT64
);
~~~

the relationship CSV can be:

~~~csv
order-100,product-9,2,1499
order-100,product-12,1,3499
~~~

and the load is:

~~~cypher
COPY CONTAINS FROM 'contains.csv' (HEADER=false);
~~~

Both `order-100` and each product key must already exist. This is another reason to use stable source identifiers: the relationship file can name endpoints without knowing Kuzu's internal IDs.

Validate imports with per-table counts and representative traversals. A file with source and destination columns reversed can contain valid values and still encode the wrong graph.

## Properties Versus Nodes

Keep a value as a property when it has no independent identity and no meaningful relationships-for example a display name, quantity, Boolean flag, or price captured on an order line. Make it a node when it is shared, queried through connections, independently updated, governed, or referenced by many entities.

For example, a free-form `city_name` property is enough for display. A `City` node is justified when users connect to cities and queries traverse regions, services, or events through them.

Avoid both extremes: a single `Entity` table with a `kind` string discards useful schema, while a node for every scalar value produces noisy traversals and complicated imports.

## Review the Model with Queries and Invariants

Before loading millions of records, test a small adversarial fixture:

- duplicate node primary key;
- missing relationship endpoint;
- two edges where multiplicity permits and forbids them;
- null optional property;
- Unicode and maximum expected identifiers;
- repeated business event;
- a reverse-direction query;
- export and import into an empty database.

Write important invariants as queries and run them after every migration. Schema captures types, endpoint pairs, keys, and at-most-one multiplicity; business rules beyond those still need explicit validation.

## Official Documentation

- [Kuzu structured property graph quick start](https://kuzudb.github.io/docs/get-started/)
- [Create node and relationship tables](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu data types and `SERIAL`](https://kuzudb.github.io/docs/cypher/data-types/)
- [Kuzu CSV node and relationship import](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu `CREATE` clause](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/create/)
- [Kuzu `MERGE` import guidance](https://kuzudb.github.io/docs/import/merge/)
- [Kuzu `ID` function and expressions](https://kuzudb.github.io/docs/cypher/expressions/)
- [Kuzu database export/import](https://kuzudb.github.io/docs/migrate/)

## Conclusion

Model durable entities as typed node tables with stable primary keys, and model connections as directed relationship tables with properties and honest multiplicity. Remember that relationship IDs are internal and parallel edges are possible. Stable external node keys make bulk import, validation, and future migration far safer than mutable names or generated positions.

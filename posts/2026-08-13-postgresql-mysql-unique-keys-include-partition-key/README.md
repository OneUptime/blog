# Why PostgreSQL and MySQL Unique Keys Must Include the Partition Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MySQL, Table Partitioning, Unique Constraints, Primary Keys, Database Design

Description: Understand why partition-local indexes cannot enforce cross-partition uniqueness, how PostgreSQL and MySQL state the rule, and which redesigns preserve the intended invariant.

---

Partitioning can turn a valid primary key into rejected DDL. The error is not arbitrary: PostgreSQL and MySQL rely on indexes that are local to physical partitions. If a unique key does not include the values that determine the partition, two equal key values can live in different partitions and neither local index can see the other.

Adding the partition key to the constraint satisfies the engine, but it may weaken the business rule. <code>UNIQUE (id, created_at)</code> says the pair is unique; it does not say <code>id</code> alone is unique. Treat this as a data-model decision, not a syntax repair.

## See the Cross-Partition Problem

Start with a globally unique order identifier:

~~~sql
CREATE TABLE orders (
    order_id bigint PRIMARY KEY,
    created_at date NOT NULL,
    customer_id bigint NOT NULL
);
~~~

Now partition by creation month in PostgreSQL:

~~~sql
CREATE TABLE orders_partitioned (
    order_id bigint NOT NULL,
    created_at date NOT NULL,
    customer_id bigint NOT NULL,
    PRIMARY KEY (order_id)
) PARTITION BY RANGE (created_at);
~~~

PostgreSQL rejects the primary key because it omits <code>created_at</code>. Imagine January and February leaves:

~~~text
orders_2026_01: order_id = 9001
orders_2026_02: order_id = 9001
~~~

Each leaf's unique index contains one value and is locally valid. Without a global index, no index detects the duplicate across leaves.

The accepted declaration is:

~~~sql
PRIMARY KEY (order_id, created_at)
~~~

Partition bounds guarantee that identical complete key pairs cannot hide in different leaves: equal <code>created_at</code> values route to the same leaf, where the child unique index checks <code>order_id</code> and <code>created_at</code>. However, order 9001 can still appear on two dates.

## PostgreSQL's Exact Rule

For a unique or primary-key constraint declared on a PostgreSQL partitioned table:

- all columns in the target table's partition key—and in the partition keys of any descendant partitioned tables—must appear in the constraint;
- none of those partition keys can contain expressions or function calls.

The documentation explains that child indexes directly enforce uniqueness only within their partitions, so the partition structure must guarantee that duplicates cannot occur in different partitions.

This applies to the constraint on the partitioned parent. Creating <code>UNIQUE (order_id)</code> separately on every leaf does not create global uniqueness. Querying the parent makes the data look like one table but does not merge those independent enforcement scopes.

A partitioned unique index is “virtual.” PostgreSQL creates or attaches matching child indexes. It is useful for consistent DDL and enforcement across the hierarchy, but it is not a single global index structure.

## MySQL's Rule Is Broader in Wording

MySQL 8.4 states:

> Every unique key on the table must use every column in the table's partitioning expression.

That includes the primary key because it is unique. If a table has no unique keys, including no primary key, this particular restriction does not apply, although the partition expression still has type and function restrictions.

For example:

~~~sql
CREATE TABLE orders (
    order_id bigint NOT NULL,
    created_at date NOT NULL,
    customer_id bigint NOT NULL,
    PRIMARY KEY (order_id)
)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
~~~

This is invalid because the column used by the partitioning expression, <code>created_at</code>, is absent from the primary key. MySQL's manual provides several examples in which every unique key—not just one chosen key—must include all partition-expression columns.

Adding <code>created_at</code> to the primary key is insufficient if another <code>UNIQUE (external_reference)</code> remains. That key must include <code>created_at</code> too, or the partition design must change.

## Do Not Confuse Physical Uniqueness With Identifier Probability

Applications often generate UUIDs or distributed numeric IDs. A well-designed generator makes collisions extremely unlikely, but probability is not a database constraint. If the requirement is “the database must reject every duplicate order ID,” a composite constraint that includes date does not enforce it.

Conversely, not every identifier needs global database enforcement. If an event ID is scoped by tenant and all API paths already identify events by <code>(tenant_id, event_id)</code>, a composite key that includes tenant may exactly express the domain. Write the invariant in plain language:

~~~text
Invariant A: order_id is globally unique.
Invariant B: order_id is unique within one tenant.
Invariant C: event_id is unique within one retention day.
~~~

Then make the SQL constraint match it. Do not start from the desired partition key and retroactively redefine the invariant.

## Redesign Options

### Include the partition key when the domain is truly composite

For tenant-scoped identifiers:

~~~sql
CREATE TABLE tenant_events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id)
) PARTITION BY HASH (tenant_id);
~~~

The constraint includes the hash partition key and expresses tenant-scoped uniqueness.

### Partition by a column already in the key

Hash partitioning by <code>order_id</code> permits <code>PRIMARY KEY (order_id)</code>. This preserves global enforcement because equal IDs route to the same leaf. It sacrifices time-range retention and may not prune date queries.

### Use a non-partitioned registry

A narrow table can own global IDs:

~~~sql
CREATE TABLE order_identity (
    order_id bigint PRIMARY KEY,
    created_at date NOT NULL
);
~~~

The application inserts into the registry and partitioned detail table in one PostgreSQL transaction. This can preserve global uniqueness, but it introduces a central index and lifecycle problem. Deleting detail partitions does not automatically decide when registry rows may be removed. Foreign keys and transaction paths must be designed and tested.

In MySQL, a similar registry requires the same careful atomic workflow, and distributed/sharded deployments add more complexity. Do not describe a registry as free global indexing.

### Accept application-generated uniqueness explicitly

Some systems accept a UUID generator plus a composite database key because the residual collision risk meets the requirement. Document that the database does not enforce ID-only uniqueness and ensure retries use the same idempotency identifier. This is a risk decision, not an equivalent constraint.

### Reconsider partitioning

If global uniqueness is mandatory, the existing primary-key lookups are fast, and partitioning offers only speculative performance, keep the unpartitioned table. A composite index, BRIN index, batched retention, or separate archive may satisfy the real objective without weakening an invariant.

## Migration Checks

Before converting a table:

~~~sql
SELECT order_id, count(*)
FROM orders
GROUP BY order_id
HAVING count(*) > 1;
~~~

An empty result validates existing data at that moment, not future enforcement. Also check the proposed composite key and every unique index:

~~~sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'orders';
~~~

For PostgreSQL, query <code>pg_constraint</code> too; not every important constraint should be inferred from names. For MySQL, inspect <code>SHOW CREATE TABLE</code> and <code>INFORMATION_SCHEMA.STATISTICS</code>.

During backfill, duplicate validation must cover data copied before cutover and changes arriving concurrently. A final count comparison alone does not prove key equality or absence of duplicates.

## Creating PostgreSQL Unique Indexes With Less Blocking

PostgreSQL does not support <code>CREATE INDEX CONCURRENTLY</code> directly on a partitioned parent. For a one-level partition tree, its partitioning documentation describes a staged technique:

1. create an index on <code>ONLY</code> the parent, initially invalid;
2. create matching indexes concurrently on leaves;
3. attach each leaf index using <code>ALTER INDEX ... ATTACH PARTITION</code>;
4. once all child indexes are attached, PostgreSQL marks the parent index valid.

The documentation also shows a variation for unique constraints. This reduces some index-build blocking but does not change the requirement to include partition-key columns, and attach operations still take locks. Rehearse the exact PostgreSQL version and schema.

## Avoid Fragile Workarounds

- **One trigger checks all partitions:** concurrent inserts can race unless serialized correctly; a trigger query alone is not a unique constraint.
- **One unique index per leaf:** it enforces only leaf-local uniqueness.
- **The ID generator never collides:** that may be acceptable risk, but it is not database rejection.
- **Include the date and call it fixed:** the invariant has changed from ID uniqueness to pair uniqueness.
- **A default partition makes it global:** default routing does not create a cross-partition index.

## Official Documentation

- [PostgreSQL: Declarative Partitioning Limitations](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)
- [PostgreSQL: Indexes on Partitioned Tables](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [PostgreSQL: Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL: ALTER INDEX](https://www.postgresql.org/docs/current/sql-alterindex.html)
- [MySQL 8.4: Partitioning Keys, Primary Keys, and Unique Keys](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html)
- [MySQL 8.4: Overview of Partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html)
- [MySQL 8.4: CREATE TABLE](https://dev.mysql.com/doc/refman/8.4/en/create-table.html)

## Conclusion

PostgreSQL and MySQL require partition-key columns in unique keys because their physical indexes cannot detect duplicates stored in another partition. Including the key makes enforcement possible, but it enforces uniqueness of the larger tuple. State the business invariant first, then choose a composite domain, compatible partition key, central registry, explicitly probabilistic ID scheme, or no partitioning. Never mistake accepted DDL for preserved semantics.

# How Foreign Keys Behave When Both PostgreSQL Tables Are Partitioned

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Table Partitioning, Foreign Keys, Referential Integrity, Database Design, SQL

Description: Design and operate foreign keys between PostgreSQL partitioned tables by aligning referenced uniqueness, indexing referencing leaves, and testing cascades and partition maintenance.

---

Current PostgreSQL can enforce a foreign key when the referencing table, the referenced table, or both are declaratively partitioned. The parent-level DDL looks ordinary, but the physical work spans child tables. The referenced key must still be provably unique across its partition hierarchy, and deletes or updates may search many referencing leaves unless their key columns are indexed.

The design is supported; it is not operationally free.

## Start With a Key PostgreSQL Can Reference

Suppose accounts are hash-partitioned by tenant:

~~~sql
CREATE TABLE accounts (
    tenant_id bigint NOT NULL,
    account_id bigint NOT NULL,
    display_name text NOT NULL,
    PRIMARY KEY (tenant_id, account_id)
) PARTITION BY HASH (tenant_id);

CREATE TABLE accounts_h0 PARTITION OF accounts
FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE accounts_h1 PARTITION OF accounts
FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE accounts_h2 PARTITION OF accounts
FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE accounts_h3 PARTITION OF accounts
FOR VALUES WITH (MODULUS 4, REMAINDER 3);
~~~

The primary key includes <code>tenant_id</code>, as PostgreSQL requires for a unique or primary-key constraint on a partitioned parent. Equal complete keys route to one hash leaf, whose child unique index enforces the constraint.

Now partition invoices by issuance time and reference accounts:

~~~sql
CREATE TABLE invoices (
    tenant_id bigint NOT NULL,
    invoice_id bigint NOT NULL,
    account_id bigint NOT NULL,
    issued_at date NOT NULL,
    amount numeric(18,2) NOT NULL,
    PRIMARY KEY (tenant_id, invoice_id, issued_at),
    CONSTRAINT invoices_account_fk
      FOREIGN KEY (tenant_id, account_id)
      REFERENCES accounts (tenant_id, account_id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
) PARTITION BY RANGE (issued_at);

CREATE TABLE invoices_2026_08 PARTITION OF invoices
FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
~~~

PostgreSQL routes an invoice insert to its time leaf and checks the referenced account through the partitioned accounts parent. The foreign-key column list must match the referenced unique key in number and compatible types.

## Referenced Uniqueness Drives the Shape

A foreign key must reference a non-deferrable primary-key or unique constraint, or the columns of a qualifying non-partial unique index. For a partitioned referenced table, the parent-level unique or primary constraint must include the partition-key columns of the target and, in a multilevel hierarchy, all descendant partitioned tables; those partition keys cannot contain expressions or function calls.

That means this desired reference is not available if accounts are partitioned by tenant but only <code>account_id</code> is named:

~~~sql
FOREIGN KEY (account_id) REFERENCES accounts (account_id)
~~~

PostgreSQL cannot create a global <code>UNIQUE (account_id)</code> on that tenant-partitioned hierarchy. Adding <code>tenant_id</code> to both the primary key and foreign key may accurately express tenant-scoped identity. If account IDs are supposed to be globally unique and referenced alone, reconsider the partition key or store the global identity in a non-partitioned registry.

Do not create a unique index on <code>account_id</code> separately in every account leaf and assume the foreign key can use them as one global target. Leaf-local indexes do not establish parent-wide uniqueness.

## Index the Referencing Columns Deliberately

PostgreSQL automatically indexes the referenced primary or unique key. It does not automatically create an index on the referencing columns. The constraints documentation explains why an index is often useful: deleting a referenced row or updating its referenced key requires finding matching rows in the referencing table.

Create the index at the partitioned parent:

~~~sql
CREATE INDEX invoices_account_fk_idx
ON invoices (tenant_id, account_id);
~~~

PostgreSQL creates matching indexes on existing leaves and on partitions created or attached later. Verify that every leaf is attached to the partitioned index:

~~~sql
WITH attached_indexes AS (
    SELECT i.indrelid,
           i.indexrelid,
           i.indisvalid
    FROM pg_partition_tree(
             'invoices_account_fk_idx'::regclass
         ) AS p
    JOIN pg_index AS i
      ON i.indexrelid = p.relid
    WHERE p.isleaf
)
SELECT t.relid::regclass AS partition_name,
       a.indexrelid::regclass AS index_name,
       a.indisvalid
FROM pg_partition_tree('invoices'::regclass) AS t
LEFT JOIN attached_indexes AS a
  ON a.indrelid = t.relid
WHERE t.isleaf
ORDER BY t.relid::regclass::text;
~~~

The useful index order depends on the referential lookup and other queries. For the foreign-key check initiated by an account deletion, the leading columns should support equality on the complete foreign key. A time-first index is not equivalent when invoices are partitioned by time and the lookup has no time predicate.

Even with local indexes, an account deletion may need to inspect every attached invoice time partition because the foreign key does not identify <code>issued_at</code>. Retention horizon and leaf count therefore affect referential-action cost.

## Choose Referential Actions From Domain Semantics

Partitioning does not change the meanings of:

- <code>NO ACTION</code>;
- <code>RESTRICT</code>;
- <code>CASCADE</code>;
- <code>SET NULL</code>;
- <code>SET DEFAULT</code>.

It changes how much physical work can lie behind them. <code>ON DELETE CASCADE</code> on an account with millions of invoices can delete across many leaves, generate substantial WAL, acquire many locks, fire triggers, and leave vacuum work. It is not a substitute for a partition-retention operation.

<code>SET NULL</code> must be compatible with nullability and the business key. With a composite foreign key under default <code>MATCH SIMPLE</code>, any null foreign-key column exempts the row from requiring a match. <code>MATCH FULL</code> requires either all components null or a complete match. Confirm that behavior before using null as a deletion policy.

Deferrable constraints can postpone a <code>NO ACTION</code> check to constraint-check time, while <code>RESTRICT</code> cannot be deferred. They do not make an invalid final state acceptable.

## Partition Keys Can Move Rows

Updating <code>invoices.issued_at</code> across a range boundary makes PostgreSQL move the row to another invoice partition, implemented internally as a delete and insert. The foreign key must remain valid, and row-level trigger behavior follows that movement.

Updating <code>accounts.tenant_id</code> is more consequential: it changes both the accounts partition key and a referenced key component. With <code>ON UPDATE CASCADE</code>, referencing invoice rows also change tenant ID while remaining in their time leaves. That can be a large multi-table operation. With <code>RESTRICT</code>, PostgreSQL prevents it when references exist.

Treat partition-key and referenced-key updates as exceptional lifecycle operations. Load-test them under the exact referential action rather than inferring cost from a one-row example.

## Understand Version Boundaries

Foreign-key capabilities for declarative partitioning arrived over multiple PostgreSQL releases. PostgreSQL 12 release notes specifically state that foreign keys could then reference partitioned tables. If supporting an older major version or restoring an old dump, verify that version's manual rather than relying on current PostgreSQL 18 behavior.

Minor releases also contain correctness fixes. Run a supported current minor release within the chosen major version, read its release notes, and reproduce attach, detach, truncate, and cascade workflows before production use.

## Plan Partition Maintenance With Dependencies

Attaching or detaching a partition is not merely file organization when foreign keys exist. Current <code>ALTER TABLE</code> documentation states that detaching can acquire a <code>SHARE</code> lock on tables that reference the partitioned table. Lock duration and constraint validation can make a retention job wait behind application transactions.

Before detaching a referenced partition:

1. identify foreign keys that reference the hierarchy;
2. prove no retained referencing row depends on rows being removed, or define the intended deletion;
3. test the exact detach form and lock behavior;
4. decide what constraints the standalone table should retain;
5. validate integrity after the operation.

Do not detach the referenced and referencing partitions independently and assume matching time bounds make it safe. The foreign key is declared against table identities and constraints, not against an operator's belief that two monthly names correspond.

Use catalog queries to map dependencies:

~~~sql
WITH invoice_tree AS (
    SELECT relid FROM pg_partition_tree('invoices'::regclass)
),
account_tree AS (
    SELECT relid FROM pg_partition_tree('accounts'::regclass)
)
SELECT c.oid AS constraint_oid,
       c.conname,
       c.conrelid::regclass AS referencing_table,
       c.confrelid::regclass AS referenced_table,
       c.conparentid AS parent_constraint_oid,
       c.convalidated
FROM pg_constraint AS c
WHERE c.contype = 'f'
  AND (
      c.conrelid IN (SELECT relid FROM invoice_tree)
      OR c.confrelid IN (SELECT relid FROM account_tree)
  )
ORDER BY c.conname, c.conrelid, c.confrelid;
~~~

Child constraints have parent relationships visible through <code>pg_constraint.conparentid</code>. Prefer catalog inspection and <code>pg_dump --schema-only</code> review over guessing from constraint names.

## Test Integrity and Cost

Create tests for:

- an insert with an existing referenced row;
- an insert with a missing key;
- each null combination under the selected match type;
- referenced delete and update under every configured action;
- a partition-key update on either side;
- attach and detach of referenced and referencing leaves;
- concurrent DML during maintenance;
- worst-case account or parent-row fan-out;
- dump and restore into the supported PostgreSQL version.

Measure plans for application joins separately from internal referential checks. A foreign key does not automatically make a user query use an index, nor does matching partitioning guarantee a partition-wise join. Planner settings, predicates, statistics, and partition bounds govern query plans.

## Official Documentation

- [PostgreSQL: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: Declarative Partitioning Limitations](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)
- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: pg_constraint](https://www.postgresql.org/docs/current/catalog-pg-constraint.html)
- [PostgreSQL: Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL 12 Release Notes: Partitioning](https://www.postgresql.org/docs/12/release-12.html)
- [PostgreSQL: pg_partition_tree](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)

## Conclusion

PostgreSQL can enforce foreign keys across partitioned tables, provided the referenced hierarchy has a valid parent-wide primary or unique key. Include the referenced partition key when required, index referencing columns across their hierarchy, and expect parent-row updates, cascades, and detach operations to touch multiple leaves and locks. The constraint is logically ordinary; its operational footprint is distributed across the partition tree.

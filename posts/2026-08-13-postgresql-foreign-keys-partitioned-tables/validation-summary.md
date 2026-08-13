# Validation Summary: How Foreign Keys Behave When Both PostgreSQL Tables Are Partitioned

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL 18
- SQL
- Declarative hash and range table partitioning
- Foreign keys and referential actions
- Primary keys, unique constraints, and partitioned indexes
- PostgreSQL system catalogs and partition-tree inspection

## Sources Consulted

- [PostgreSQL 18: Foreign Key Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html)
- [PostgreSQL 18: Table Partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html)
- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html)
- [PostgreSQL 18: Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)
- [PostgreSQL 18: Trigger Behavior](https://www.postgresql.org/docs/18/trigger-definition.html)
- [PostgreSQL 18: `pg_constraint`](https://www.postgresql.org/docs/18/catalog-pg-constraint.html)
- [PostgreSQL 18: `pg_index`](https://www.postgresql.org/docs/18/catalog-pg-index.html)
- [PostgreSQL 18: `pg_inherits`](https://www.postgresql.org/docs/18/catalog-pg-inherits.html)
- [PostgreSQL 18: Partitioning Information Functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL 11 Release Notes](https://www.postgresql.org/docs/11/release-11.html)
- [PostgreSQL 11: Declarative Partitioning Limitations](https://www.postgresql.org/docs/11/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)
- [PostgreSQL 12 Release Notes](https://www.postgresql.org/docs/12/release-12.html)
- [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/)

## Issues Found

- The referenced-key rule omitted that a primary-key or unique constraint used as a foreign-key target must be non-deferrable. The text now states that requirement while retaining the documented alternative of a qualifying non-partial unique index.
- The partitioned-uniqueness explanation covered only the target table's partition key. In a multilevel hierarchy, the constraint must include the partition-key columns of descendant partitioned tables too, and those partition keys cannot use expressions or function calls. The explanation was corrected accordingly.
- The index query listed all indexes on tables in the `invoices` hierarchy and used `pg_index.indisvalid`, which does not prove that a leaf index is attached to `invoices_account_fk_idx`. It now walks the partitioned index's own tree and left-joins it to every table leaf, so an absent attachment is visible.
- The foreign-key dependency query compared only the two parent table OIDs and did not display the `conparentid` relationship discussed by the post. It now searches both complete table hierarchies and reports constraint OIDs, parent constraint OIDs, and validation state.
- The `pg_partition_tree` documentation link pointed to the obsolete `functions-info.html` location. It now points to the function's PostgreSQL 18 location under system administration functions.

## Review Notes

The DDL and corrected catalog queries were executed successfully on PostgreSQL 18.4. Testing confirmed valid and invalid foreign-key inserts, the attached leaf-index result, generated constraint ancestry, and an `ON UPDATE CASCADE` that moved a referenced row between hash partitions while updating referencing rows in their time partition.

The version history is accurate: PostgreSQL 11 added foreign keys from partitioned tables, and PostgreSQL 12 added foreign keys referencing partitioned tables, enabling both sides to be partitioned. PostgreSQL 12 is now unsupported, so the post's recommendation to run a supported current minor release remains important. Also, `TRUNCATE CASCADE` has different behavior from `ON DELETE CASCADE`; the post appropriately recommends testing truncate workflows separately.

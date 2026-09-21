# Validation Summary: How to Validate PostgreSQL Publisher and Subscriber Data Before Cutover

## Status

validated

## Post Type

Technical guide with SQL and Bash examples.

## Technologies Covered

- PostgreSQL 18 logical replication, publications, subscriptions, and relation readiness catalogs.
- SQL schema definitions, transaction boundaries, ordered queries, and CSV exports.
- PostgreSQL psql and libpq connection services.
- Bash error handling and the cmp file comparison utility.
- Sequences, large objects, row-level security, triggers, and planner statistics.

## Sources Consulted

- [PostgreSQL 18 logical replication](https://www.postgresql.org/docs/18/logical-replication.html): subscription consistency and transaction ordering.
- [pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html): inventory columns and implicit publication membership.
- [pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html): relation identifiers and readiness states.
- [pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html): join columns and cluster-wide catalog scope.
- [CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html): automatic table inclusion, published operations, filters, column lists, and partition behavior.
- [ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html): ADD TABLE syntax and ownership requirements.
- [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html): refresh syntax, initial copy behavior, transaction restrictions, and two-phase restrictions.
- [COPY](https://www.postgresql.org/docs/18/sql-copy.html): query exports, client streaming, CSV null quoting, privileges, and text representation settings.
- [psql](https://www.postgresql.org/docs/18/app-psql.html): connection arguments, -X, -v, -c, ON_ERROR_STOP, and exit statuses.
- [libpq connection service files](https://www.postgresql.org/docs/18/libpq-pgservice.html): named service connections.
- [Logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html): sequence state, schema changes, and large objects.
- [Logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html): initial synchronization and subscriber trigger behavior.
- [Row security policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html): role-dependent row visibility and RLS bypass behavior.
- [Date/time functions](https://www.postgresql.org/docs/18/functions-datetime.html): clock_timestamp().
- [ANALYZE](https://www.postgresql.org/docs/18/sql-analyze.html): statistics used by query planning.
- Local Bash built-in documentation, via `bash -c 'help set'`: errexit, nounset, and pipefail.
- Local operating-system cmp(1) manual, via `man -M /usr/share/man 1 cmp`: byte comparison and exit statuses.
- [Author profile](https://github.com/nawazdhandala): verified the article's author URL redirects to the intended profile.

## Issues Found

1. **Marker publication prerequisites were incomplete.** The unconditional ADD TABLE instruction did not account for publications that already include the new table automatically, and the marker requires INSERT publication. Updated the introduction to the command to require insert operations and make the addition conditional on existing all-table or schema membership.
2. **Refresh restrictions were omitted.** REFRESH PUBLICATION cannot run inside a transaction block, and its default initial-copy behavior is incompatible with an enabled two-phase subscription. Clarified the execution context and the conditional use of `WITH (copy_data = false)`, limited to an empty new barrier table and no other newly subscribed tables requiring an initial copy.
3. **Export visibility was unspecified.** Successful COPY queries can still omit rows because of row-level security, permitting matching exports that do not cover the intended dataset. Added the requirement that export roles have SELECT privileges and visibility of every expected row.

## Review Notes

- The article is technically relevant and contains executable implementation examples. No deprecated syntax was identified for PostgreSQL 18.
- Verified the inventory column names, subscription join and database filter, ready state, marker table definition, INSERT, ordered COPY queries, shell quoting, service connections, and comparison command against documentation. The Bash block also passed a local syntax check.
- The marker is an operational inference from documented ordering within one subscription. Its use depends on ready relations, completion of preceding write transactions, a fresh subscriber snapshot, and continued fencing of writers. It does not by itself prove row equality.
- CSV distinguishes SQL nulls from literal null-marker text. psql suppresses the COPY command tag for COPY TO STDOUT, so successful exports contain the row stream rather than an appended row-count tag.
- The complete range inventory must cover keys present on either side, including unexpected subscriber-only rows. Canonical datatype output and compatible ordering remain necessary when representations differ.
- Default subscriber apply behavior suppresses ordinary triggers; replica-enabled or always-enabled triggers can still affect data. The article appropriately calls for examining subscriber triggers and business invariants.
- Sequence state, large-object contents, schema compatibility, permissions, and application behavior require independent checks. Matching ordinary table exports does not validate these items.
- All article documentation links resolved to the relevant PostgreSQL 18 resources. The author link also resolved.
- This was a documentation-based technical review, not an end-to-end replication rehearsal. The installed PostgreSQL tools report version 14.17; no PostgreSQL 18 publisher/subscriber deployment was executed. Existing README edits were preserved, with only the corrections listed above applied.

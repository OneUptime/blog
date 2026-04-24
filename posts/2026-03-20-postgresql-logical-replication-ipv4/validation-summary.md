# Validation Summary: How to Configure PostgreSQL Logical Replication with IPv4 Publishers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL 15
- PostgreSQL logical replication
- Publications and subscriptions
- `postgresql.conf`
- `pg_hba.conf`
- SQL DDL and replication monitoring views

## Sources Consulted
- PostgreSQL 15 Documentation: Chapter 31. Logical Replication - https://www.postgresql.org/docs/15/logical-replication.html
- PostgreSQL 15 Documentation: 31.2. Subscription - https://www.postgresql.org/docs/15/logical-replication-subscription.html
- PostgreSQL 15 Documentation: 31.7. Architecture - https://www.postgresql.org/docs/15/logical-replication-architecture.html
- PostgreSQL 15 Documentation: 31.9. Security - https://www.postgresql.org/docs/15/logical-replication-security.html
- PostgreSQL 15 Documentation: CREATE PUBLICATION - https://www.postgresql.org/docs/15/sql-createpublication.html
- PostgreSQL 15 Documentation: CREATE SUBSCRIPTION - https://www.postgresql.org/docs/15/sql-createsubscription.html
- PostgreSQL 15 Documentation: 21.1. The `pg_hba.conf` File - https://www.postgresql.org/docs/15/auth-pg-hba-conf.html
- PostgreSQL 15 Documentation: 28.2. The Cumulative Statistics System - https://www.postgresql.org/docs/15/monitoring-stats.html
- PostgreSQL 15 Documentation: 9.27. System Administration Functions - https://www.postgresql.org/docs/15/functions-admin.html
- PostgreSQL 15 Documentation: 31.5. Conflicts - https://www.postgresql.org/docs/15/logical-replication-conflicts.html

## Issues Found
- The article said “publish all tables in a schema” but used `CREATE PUBLICATION ... FOR ALL TABLES`, which publishes all tables in the database. This was corrected to `FOR TABLES IN SCHEMA public` and annotated as a superuser-only variant.
- The subscriber example created `orders` and `customers` but omitted `products`, even though `products` was part of the publication. The example was corrected so the subscriber setup covers all published tables shown in the article.
- The subscriber example suggested `ALTER TABLE ... OWNER TO replicator` as a way to grant replication apply privileges. That was inaccurate and incomplete because the post never created a local `replicator` role on the subscriber, and PostgreSQL applies logical replication changes with the privileges of the subscription owner. The incorrect ownership changes were replaced with an accurate note about creating the subscription as a superuser and ensuring the owner has the required privileges.
- The monitoring query used `pg_last_xact_replay_timestamp()`, which is for recovery/standby replay and returns `NULL` on a normally running logical subscriber. It was replaced with a `pg_stat_subscription` query based on `latest_end_time`.
- The `ALTER SUBSCRIPTION ... REFRESH PUBLICATION` example did not mention that newly added published tables must also exist on the subscriber before refresh. A prerequisite note was added.

## Review Notes
- The corrected post is technically accurate for PostgreSQL 15 built-in logical replication.
- The query against `pg_subscription.subconninfo` is valid for privileged users, but it can expose connection details and is not readable by normal users; a future revision could prefer less sensitive status fields.

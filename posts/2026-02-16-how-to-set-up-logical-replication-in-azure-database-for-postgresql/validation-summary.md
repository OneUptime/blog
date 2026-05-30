# Validation Summary: How to Set Up Logical Replication in Azure Database for PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- PostgreSQL logical replication
- PostgreSQL publications and subscriptions
- PostgreSQL replication slots
- Azure CLI
- pg_dump and psql

## Sources Consulted
- Azure Database for PostgreSQL Flexible Server logical replication and logical decoding documentation: https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/concepts-logical
- Azure Database for PostgreSQL server parameter documentation: https://learn.microsoft.com/en-us/azure/postgresql/server-parameters/how-to-server-parameters-set-value
- Azure CLI documentation for PostgreSQL Flexible Server parameters: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/parameter
- PostgreSQL logical replication overview: https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL publication documentation: https://www.postgresql.org/docs/current/logical-replication-publication.html
- PostgreSQL CREATE PUBLICATION documentation: https://www.postgresql.org/docs/current/sql-createpublication.html
- PostgreSQL logical replication restrictions: https://www.postgresql.org/docs/current/logical-replication-restrictions.html
- PostgreSQL logical replication configuration settings: https://www.postgresql.org/docs/current/logical-replication-config.html
- PostgreSQL pg_subscription_rel catalog documentation: https://www.postgresql.org/docs/current/catalog-pg-subscription-rel.html

## Issues Found
- The post said logical replication replicates INSERT, UPDATE, and DELETE operations, but current PostgreSQL logical publications also include TRUNCATE by default. Updated the claim to mention TRUNCATE support on PostgreSQL 11+.
- The prerequisite text implied every published table must have a primary key or REPLICA IDENTITY. PostgreSQL requires replica identity for UPDATE and DELETE replication, not for insert-only publications. Updated the wording to scope the requirement to publications that include UPDATE or DELETE.
- The publication verification query omitted the `pubtruncate` column. Added `pubtruncate` so the query reflects the current publication operation flags.
- The `pg_subscription_rel.srsubstate` table mislabeled `d` and omitted `f`. Updated `d` to "Data is being copied" and added `f` as "Finished table copy."

## Review Notes
The Azure CLI parameter commands and restart command match current Azure documentation. The SQL examples for publications, subscriptions, replication slot monitoring, schema-only dumps, and subscription management are consistent with PostgreSQL and Azure documentation. The post remains a practical guide rather than an exhaustive production checklist; future improvements could mention subscriber-side worker settings and same-cluster subscription caveats for advanced deployments.

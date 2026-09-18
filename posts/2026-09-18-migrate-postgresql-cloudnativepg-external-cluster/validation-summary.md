# Validation Summary: Migrate PostgreSQL to CloudNativePG via an External Cluster with Low Downtime

## Status
validated

## Post Type
Technical migration guide with SQL, Kubernetes YAML, and CLI commands.

## Technologies Covered
- CloudNativePG 1.30: Cluster and Subscription resources, schema import, external cluster connections, and primary services.
- PostgreSQL 18: logical replication, publications, replica identity, replication slots, sequences, and TLS.
- Kubernetes: Secrets, storage, service networking, and kubectl.

## Sources Consulted
- [CloudNativePG v1.30.0 release](https://github.com/cloudnative-pg/cloudnative-pg/releases/tag/v1.30.0).
- [CloudNativePG 1.30 database import](https://cloudnative-pg.io/docs/1.30/database_import/#online-import-and-upgrades) and [release-pinned source](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/docs/src/database_import.md).
- [CloudNativePG 1.30 logical replication](https://cloudnative-pg.io/docs/1.30/logical_replication/#subscriptions) and [release-pinned source](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/docs/src/logical_replication.md).
- [CloudNativePG bootstrap documentation](https://cloudnative-pg.io/docs/1.30/bootstrap/#bootstrap-from-another-cluster) and [release-pinned source](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/docs/src/bootstrap.md).
- [CloudNativePG v1.30.0 Cluster CRD](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/config/crd/bases/postgresql.cnpg.io_clusters.yaml).
- [CloudNativePG v1.30.0 Subscription CRD](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/config/crd/bases/postgresql.cnpg.io_subscriptions.yaml).
- [CloudNativePG kubectl plugin documentation](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/docs/src/kubectl-plugin.md).
- [CloudNativePG service management](https://github.com/cloudnative-pg/cloudnative-pg/blob/v1.30.0/docs/src/service_management.md).
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html).
- [PostgreSQL logical replication configuration](https://www.postgresql.org/docs/18/logical-replication-config.html).
- [PostgreSQL logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html).
- [PostgreSQL logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html).
- [PostgreSQL CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html).
- [PostgreSQL DROP SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-dropsubscription.html).
- [PostgreSQL pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html).
- [PostgreSQL replication statistics](https://www.postgresql.org/docs/18/monitoring-stats.html).
- [PostgreSQL sequence functions](https://www.postgresql.org/docs/18/functions-sequence.html).
- [PostgreSQL libpq TLS verification](https://www.postgresql.org/docs/18/libpq-ssl.html).
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/).

## Issues Found
1. **Incomplete multiple-database instructions.** Repeating subscriptions and validation does not create the other databases' schemas. Clarified that each schema must be imported first and that the shown microservice bootstrap imports one database per target cluster.
2. **Implicit logical WAL prerequisite.** Made `wal_level = logical` explicit in the source setup instructions; slots and WAL senders alone do not enable logical decoding.
3. **Publication permissions and replica identity prerequisites.** Specified that `FOR ALL TABLES` requires superuser privileges, with an explicit-table publication alternative for restricted managed services. Required usable replica identity for tables receiving updates or deletes before publication, since the default publication includes those operations and can otherwise break source writes.
4. **Service address scope.** Qualified the cutover address as an endpoint for applications inside the Kubernetes cluster. The default ClusterIP service and `.svc` name are not a generally reachable endpoint for external clients.

## Review Notes
- Confirmed v1.30.0 is a published stable release and PostgreSQL 18 is supported. The illustrative `18-standard-trixie` image also appears in the release's own logical replication example; the post correctly recommends pinning a tested digest.
- Parsed both YAML documents and checked supplied spec fields, required fields, scalar types, and enum values against the release-pinned Cluster and Subscription CRDs. This was a static check, not Kubernetes admission or CEL/webhook execution.
- Confirmed schemaOnly, externalClusterName, publicationName, password and CA Secret selectors, and the delete reclaim policy. The SQL publication statement and both CLI commands match the documented syntax. The plugin forwards arguments after `--` to psql and selects the primary by default.
- Confirmed the distinction between a one-off physical bootstrap and continuous replication; the documented physical prerequisites agree with the post.
- Confirmed that table state `r` means ready for normal replication. The marker check after draining writers and completing table synchronization gives a meaningful cutover boundary for the single subscription shown. Sequence state, DDL, and large objects require separate handling as stated.
- Source connectivity during subscription deletion is necessary for automatic source-slot cleanup. The rollback distinction before and after target writes is correct.
- The three CloudNativePG documentation pages returned HTTP 200 through direct retrieval. The browser tool could not render them, so their contents were reviewed using the official v1.30.0 repository sources. PostgreSQL and release links resolved to the intended official resources.
- No live migration was executed: no source database, target Kubernetes environment, credentials, or extension inventory was supplied. Application validation, downtime measurements, slot monitoring, and backup restoration remain deployment-specific checks.

# Migrate PostgreSQL to CloudNativePG via an External Cluster with Low Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Migration, Logical Replication

Description: Migrate a PostgreSQL database into CloudNativePG with schema import, an external-cluster subscription, and a controlled write cutover.

An `externalClusters` entry describes how CloudNativePG connects to a source; it does not, by itself, keep a migration synchronized. For a conventional database outside Kubernetes, use schema import followed by logical replication. Keep the source serving traffic during the initial copy, then pause writes briefly for the final cutover.

This workflow uses the CloudNativePG 1.30 API. The project lists [v1.30.0 as a stable release](https://github.com/cloudnative-pg/cloudnative-pg/releases/tag/v1.30.0). Adapt PostgreSQL images and extension versions to your tested migration path. Minimal downtime still requires a write pause, connection replacement, and application validation.

## Choose the replication method deliberately

CloudNativePG documents [online import using schema-only bootstrap and a Subscription resource](https://cloudnative-pg.io/docs/1.30/database_import/#online-import-and-upgrades). Logical replication can also move between supported PostgreSQL major versions, subject to PostgreSQL and extension compatibility.

Physical `pg_basebackup` is a different workflow. It requires matching architecture, PostgreSQL major version, and tablespace layout. CloudNativePG's [bootstrap documentation](https://cloudnative-pg.io/docs/1.30/bootstrap/#bootstrap-from-another-cluster) discourages using it for arbitrary external installations unless every prerequisite has been tested. A plain base-backup bootstrap also does not establish continuous replication unless a replica-cluster configuration is supplied.

Inventory databases, extensions, ownership, tables without usable replica identity, sequences, and large objects before choosing logical migration. PostgreSQL does not automatically replicate DDL, sequence state, or large objects through ordinary logical replication. Freeze schema changes and plan explicit handling for anything outside the publication. See [logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html).

## Prepare the source and credentials

The following example assumes one application database named `app`, ordinary tables, and a target owner also named `app`. For multiple databases, import each database's schema before creating its subscription, then validate each database; the shown `microservice` bootstrap imports only one database per target cluster. There is no cluster-wide transaction boundary across subscriptions.

Configure the source with `wal_level = logical`, with enough replication slots and WAL senders for initial synchronization and steady-state streaming. Establish a TLS connection from the target Kubernetes network, and restrict the source's access rules to the migration identity and expected client network.

Give the migration identity the source permissions needed for schema extraction, replication, and the initial table copy. In a simple single-owner database this can be its application owner with temporary replication permission; managed services may require provider-specific setup. Before creating the publication, ensure every table that receives updates or deletes has a usable replica identity. A database administrator with superuser privileges creates the `FOR ALL TABLES` publication (on a managed service without this privilege, use an explicit table publication with the required ownership permissions):

```sql
-- Run in the source app database after reviewing its tables.
CREATE PUBLICATION cnpg_migration FOR ALL TABLES;
```

Before publication and schema import, create a small application-approved marker table that you can use for the final synchronization check. Keep the target inaccessible to application writers throughout the copy.

Create `source-login` with a `password` key and `source-ca` with a `ca.crt` key in the target namespace using your secret manager. Do not place their values in the Cluster manifest.

## Import the schema and subscribe

This target manifest assumes those Secrets exist and a default StorageClass is available. The PostgreSQL image is illustrative; pin an approved digest for the deployment.

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-target
  namespace: database
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:18-standard-trixie
  storage:
    size: 100Gi
  bootstrap:
    initdb:
      database: app
      owner: app
      import:
        type: microservice
        schemaOnly: true
        databases:
          - app
        source:
          externalCluster: legacy
  externalClusters:
    - name: legacy
      connectionParameters:
        host: postgres-source.example.internal
        dbname: app
        user: migration_user
        sslmode: verify-full
      password:
        name: source-login
        key: password
      sslRootCert:
        name: source-ca
        key: ca.crt
---
apiVersion: postgresql.cnpg.io/v1
kind: Subscription
metadata:
  name: app-migration
  namespace: database
spec:
  cluster:
    name: app-target
  dbname: app
  name: app_migration
  externalClusterName: legacy
  publicationName: cnpg_migration
  subscriptionReclaimPolicy: delete
```

The [Subscription API](https://cloudnative-pg.io/docs/1.30/logical_replication/#subscriptions) connects through the named external cluster and performs the initial copy. Check its status and database-side synchronization:

```bash
kubectl get subscription app-migration -n database -o yaml
kubectl cnpg psql app-target -n database -- app -c \
  "SELECT srrelid::regclass, srsubstate FROM pg_subscription_rel;"
```

Every subscribed table must finish synchronization, with `srsubstate = 'r'`. Investigate permission errors, missing tables, and replica-identity errors before cutover. Monitor the source slot's retained WAL: a stalled migration must not fill the source disk. PostgreSQL documents the relevant [replication statistics](https://www.postgresql.org/docs/18/monitoring-stats.html).

## Make the cutover a measured boundary

Stop every source writer, including workers, scheduled jobs, and maintenance tasks. Drain existing write transactions. Commit a unique marker through the source publication, then wait until the target contains that marker after all tables are synchronized. Compare critical business totals and selected records while both sides are stable. A low lag metric alone is insufficient evidence.

Copy each sequence's final state, preserving its `is_called` meaning, and validate extension-specific migration steps. Delete the migration Subscription only after synchronization is complete; the configured delete reclaim policy removes the SQL subscription. Keep the source reachable during cleanup and verify its migration slot is gone.

Point applications running inside the Kubernetes cluster at `app-target-rw.database.svc` (external clients need a separately configured reachable endpoint), supply the target credentials, and reopen connections. Test a committed write and subsequent read through the application. Record the write-pause duration and the first successful request.

Retain the source without application writes for the agreed rollback period. Before the target accepts writes, returning traffic to the source is straightforward. After target writes begin, returning requires deliberate data reconciliation. Finish by taking and restoring a target backup in an isolated environment so that the migration also establishes a working recovery path.

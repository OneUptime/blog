# CloudNativePG Backup Succeeds but Restore Fails: Check WAL and Backup Layout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Backup, Recovery, WAL Archiving

Description: Diagnose CloudNativePG restores that fail despite successful backups by checking the Barman catalog, source identity, WAL continuity, and restore credentials.

---

A completed `Backup` resource records a successful backup operation. It does not prove that today's recovery environment can read every required object, decrypt it, or replay WAL to your chosen recovery target. Those dependencies can change after the backup finishes.

For CloudNativePG 1.30, use the Barman Cloud plugin workflow described below. Its current documentation describes version 0.15.0. Record the versions actually installed in your environment, including the plugin sidecar's Barman version, before comparing behavior with documentation.

## Locate the first failed stage

Start with the source backup and recovering cluster:

```bash
kubectl get backups.postgresql.cnpg.io -n database
kubectl describe backups.postgresql.cnpg.io orders-daily -n database
kubectl get cluster orders-restore -n database -o yaml
kubectl get pods,jobs -n database -l cnpg.io/cluster=orders-restore
kubectl get events -n database --sort-by=.lastTimestamp
```

Inspect the bootstrap job or instance that actually failed; it may not be the final PostgreSQL pod. Discover its container names and read each relevant log:

```bash
kubectl get pod RESTORE_POD -n database \
  -o jsonpath='{.spec.containers[*].name}{"\n"}'
kubectl logs RESTORE_POD -n database --all-containers=true
```

Replace `RESTORE_POD` with the observed name. For an initialized instance using the standard plugin container, the [plugin troubleshooting guide](https://cloudnative-pg.io/plugin-barman-cloud/docs/troubleshooting/) also directs you to `plugin-barman-cloud` logs. Use `--previous` when the failing container restarted.

Classify the failure before changing configuration: plugin unavailable, authentication failure, backup not found, extraction failure, PostgreSQL startup failure, or recovery target not reached. Each belongs to a different stage.

## Match the complete archive identity

The source is more than a bucket. Record endpoint, bucket, destination prefix, server name, backup ID, PostgreSQL major version, and requested target. A cluster rename does not rename archived objects.

The plugin uses an `ObjectStore` for connection settings and a plugin `serverName` parameter for the archived server. The following is a fragment of the *new recovery Cluster*, not the source:

```yaml
spec:
  bootstrap:
    recovery:
      source: archived-orders
  externalClusters:
    - name: archived-orders
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: orders-archive
          serverName: orders
```

Here, `archived-orders` is a local reference, `orders-archive` is the Kubernetes `ObjectStore` name, and `orders` identifies the archived server. Do not put `serverName` under `ObjectStore.spec.configuration`; the plugin [parameter documentation](https://cloudnative-pg.io/plugin-barman-cloud/docs/parameters/) reserves that legacy field for compatibility and says to leave it empty.

A common mistake is changing `serverName` to `orders-restore`, which asks Barman to find backups of a server that never wrote to that archive.

## Inspect the backup catalog with recovery credentials

Use an approved administrative environment running a compatible Barman Cloud version. Configure its credentials and CA trust as you would for recovery, then list the catalog:

```bash
barman-cloud-backup-list --cloud-provider aws-s3 \
  --format json s3://company-backups/postgres orders
```

For a private S3-compatible service, add its documented `--endpoint-url`. This read-only command is described in the [Barman Cloud command reference](https://docs.pgbarman.org/release/3.20.0/user_guide/barman_cloud.html#barman-cloud-backup-list).

Confirm the expected backup is complete and its required objects remain present. A successful listing is not proof that every backup tarball and WAL file is readable. Restore permissions can differ from backup permissions; with KMS encryption, upload authorization also does not establish decrypt authorization.

Compare bucket lifecycle policies, archive storage classes, object versions, and key availability. Objects moved to an offline retrieval tier may require restoration before the database can fetch them. Do not reorganize the prefix manually to make a listing look correct.

## Establish WAL continuity and target reachability

Physical recovery needs WAL covering the base backup and the selected recovery target. A valid base backup plus a missing intervening WAL segment is insufficient.

CloudNativePG's [recovery documentation](https://cloudnative-pg.io/docs/1.30/recovery/) explains backup selection. With a timestamp or LSN target, it selects an appropriate preceding backup unless you specify a backup ID. An explicitly selected backup that is too new cannot recover an earlier point in time.

Read the requested WAL filename, timeline, and target from the recovery logs. A final archive lookup returning “not found” can be normal when recovery searches for the next segment; distinguish that from a missing segment required to reach consistency or an explicit target. Do not interpret every missing-object message as corruption, or suppress every one as harmless.

On the source, inspect `pg_stat_archiver` and plugin logs. Current successful uploads do not fill an older gap that was permanently deleted. Restore the missing objects from protected versions or another verified archive if available; otherwise choose a recoverable target and document the loss boundary.

## Validate a fresh isolated recovery

Retry using a new cluster name and fresh storage after correcting the demonstrated problem. Match the source PostgreSQL major version, required extensions, tablespaces, and encryption access. Keep application traffic away until recovery completes and data checks pass.

Use read-only credentials for the source archive when practical. If the restored cluster will archive its own WAL, configure a separate destination identity; [plugin recovery configuration](https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/#restoring-a-cluster) distinguishes recovery reads from new archive writes.

Verify representative records before and after the requested boundary, application schema, and the restore duration. Schedule this exercise regularly. A useful backup dashboard reports successful restores and tested recovery windows alongside completed backup jobs.

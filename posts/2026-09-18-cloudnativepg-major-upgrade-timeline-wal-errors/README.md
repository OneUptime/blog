# Recover CloudNativePG Major Upgrade Cutovers with Timeline or WAL Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Upgrade, Troubleshooting

Description: Diagnose CloudNativePG major-upgrade failures by separating upgrade jobs, incompatible WAL archives, and safe rollback or recovery boundaries.

A timeline error during a PostgreSQL major upgrade does not necessarily mean the data conversion failed. The upgrade job may have completed while WAL archiving or replica creation subsequently failed. Those situations have different recovery procedures, so preserve the current state before changing images or deleting resources.

This guide follows CloudNativePG 1.30 and its [PostgreSQL upgrade procedure](https://cloudnative-pg.io/docs/1.30/postgres_upgrades/). An in-place major upgrade is offline: the operator stops the cluster, runs `pg_upgrade`, and rebuilds replicas after success. It is not a rolling minor update and it does not retain uninterrupted client connections.

## Establish which operation failed

Pause application writes and automated changes to the Cluster manifest. Record the old and requested image, storage layout, backup configuration, and when the last application write succeeded.

```bash
kubectl get cluster app-db -n database -o yaml
kubectl get jobs,pods,pvc -n database -l cnpg.io/cluster=app-db
kubectl get events -n database --sort-by=.metadata.creationTimestamp
kubectl cnpg status app-db -n database --verbose
```

Find the actual upgrade Job name in the returned resources. CloudNativePG normally appends `-major-upgrade` to the primary instance name. Read its logs and describe its Pod to distinguish a failed conversion from an image pull, scheduling, or volume attachment problem:

```bash
# Substitute the upgrade Job discovered above.
kubectl logs -n database job/app-db-1-major-upgrade --all-containers=true
kubectl describe job app-db-1-major-upgrade -n database
kubectl describe pods -n database -l batch.kubernetes.io/job-name=app-db-1-major-upgrade
```

Inspect `.status.pgDataImageInfo` and the job result alongside the running image. Do not infer the on-disk version solely from `.spec.imageName`; that field is the requested state.

## Identify the actual WAL mismatch

Classify the error and investigate the corresponding boundary:

| Evidence | What to check |
|---|---|
| Upgrade job cannot load an extension | Old and new extension libraries, their PostgreSQL majors, and supported extension upgrade path |
| Archive reports an existing incompatible WAL object | Old and new archive namespace, server name, and database system identity |
| Restore cannot find a timeline history file | Whether the chosen backup and archive form one complete recovery chain |
| Replica cannot replay WAL after a successful upgrade | Whether it is being rebuilt from the new primary instead of reusing old-major data |
| Authentication or object-store errors | Secret references, endpoint, permissions, and plugin logs |

The [PostgreSQL continuous archiving documentation](https://www.postgresql.org/docs/18/continuous-archiving.html) explains why a base backup needs the correct WAL sequence and timeline history. Restoring a directory of unrelated WAL files cannot repair an incompatible recovery chain.

A major upgrade creates a new database system identity and starts a new timeline history. Timeline numbers and WAL filenames can therefore overlap with the old system's files. Keep the old backup history intact and configure a separate archive identity for the new major version. PostgreSQL cannot replay old-major WAL into a new-major database, and point-in-time recovery cannot cross that upgrade boundary.

For Barman Cloud, inspect both the referenced ObjectStore and the Cluster plugin's `serverName` parameter. Preserve the old archive for rollback and use a distinct server name for the upgraded database. Follow the installed plugin's [configuration documentation](https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/); plugin configuration is separate from the deprecated in-tree backup API.

Do not remove archive objects or disable an empty-archive safety check to suppress the error. First prove that the archive destination belongs to the correct database system.

## Recover an upgrade that did not complete

If the upgrade Job failed and the original database has not been replaced by a successfully started upgraded system, CloudNativePG documents reverting the requested image to the original major version. The operator recognizes that rollback and removes the failed upgrade Job.

Apply that change through the same configuration source that initiated the upgrade. Restore any archive configuration changed for the attempt as part of the reviewed rollback. Keep application access closed until the operator and PostgreSQL agree on the original version and normal writes have been tested.

The original and target images must use the same operating-system distribution for the supported in-place path. Extension compatibility must also be verified. Correct the failed prerequisite and rehearse the entire upgrade against a restored copy before retrying production.

Do not manually run `pg_resetwal` or edit `PG_VERSION` to make a failed upgrade start. Those actions bypass the evidence needed to establish whether the database is consistent.

## Recover after the new major has started

Once the upgraded database is running, changing its image back to the old major is not a downgrade procedure. CloudNativePG uses `pg_upgrade --link`; PostgreSQL's [pg_upgrade documentation](https://www.postgresql.org/docs/18/pgupgrade.html) explains the rollback restriction after the new cluster starts with linked files.

At that point, either fix the new-major archive or extension configuration and continue forward, or restore the pre-upgrade backup into a separate cluster running the original major. Select a recovery point before the upgrade and explicitly account for any writes accepted afterward. Never attach original-major replicas to the new-major primary.

## Reopen traffic with evidence

Confirm the actual server version, required extensions, and replica health. Run application queries and update optimizer statistics as appropriate for the upgraded PostgreSQL version. Validate the read-write service from a client, rather than relying only on Pod readiness.

Take a new base backup in the new archive namespace and perform an isolated restore. A healthy primary with a broken archive is still an unfinished cutover. Retain the old backup chain according to the recovery policy, record the boundary between database generations, and alert separately on application availability and continuous archiving failures.

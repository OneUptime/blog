# Validation Summary: How to Deploy MongoDB on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- MongoDB (replica set)
- Bitnami MongoDB Helm chart
- Rancher / Kubernetes
- Helm
- Longhorn (storage)
- Prometheus (via ServiceMonitor)
- kubectl / mongosh
- Kubernetes CronJob (mongodump backups)

## Sources Consulted
- Bitnami MongoDB Helm chart values reference: https://github.com/bitnami/charts/blob/main/bitnami/mongodb/values.yaml
- Bitnami MongoDB chart on Artifact Hub: https://artifacthub.io/packages/helm/bitnami/mongodb
- MongoDB Shell (mongosh) connection documentation: https://www.mongodb.com/docs/mongodb-shell/connect/
- MongoDB connection string options: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes container command and args (no shell unless explicitly invoked): https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
1. **Incorrect Pod Disruption Budget key in `mongodb-values.yaml`.** The post used `podDisruptionBudget.enabled`, which is not a recognized field in the current Bitnami MongoDB chart. The chart uses `pdb.create`. Updated the values block to `pdb: { create: true, minAvailable: 2 }` so the PDB actually gets created.
2. **CronJob `$(date +%Y%m%d)` would not be evaluated at runtime.** Kubernetes container `command` does not invoke a shell, so `$(...)` shell command substitution is passed as a literal string and `mongodump --out=/backup/$(date +%Y%m%d)` would create a directory named literally `$(date +%Y%m%d)`. Wrapped the command in `/bin/sh -c "..."` so the date is evaluated when the job runs. Also switched the password reference to `${MONGODB_ROOT_PASSWORD}` (shell expansion under `sh -c`) since we are no longer relying on Kubernetes' container-level `$(VAR)` substitution.
3. **`mongosh` connections were missing the auth database.** For the Bitnami chart, the `root` user is created in the `admin` database. Added `admin --authenticationDatabase admin` to the `mongosh` invocations in Step 5 and Step 6 so authentication succeeds against the right database (the previous form would fail or behave unexpectedly because no default database/auth source was supplied to the shell session).

## Review Notes
- The post uses the deprecated singular `auth.username`, `auth.password`, and `auth.database` keys instead of the newer array-based `auth.usernames`, `auth.passwords`, `auth.databases`. The deprecated form still works in current Bitnami chart releases for backward compatibility, so no functional change was needed, but a future revision should switch to the array-based form to be future-proof.
- The Step 8 CronJob references a `mongodb-backup-pvc` PersistentVolumeClaim that the post does not create. Readers will need to provision this PVC themselves before the CronJob will run successfully. Not a technical inaccuracy in the manifest itself, but worth flagging.
- `image: bitnami/mongodb:latest` in the CronJob is acceptable for a tutorial but pinning to a specific tag is recommended in production. Note also that since mid-2025 Bitnami restructured its public catalog on Docker Hub; readers running this in production should confirm the image source they are using is still freely available or switch to `bitnamilegacy/mongodb` / `bitnamisecure/mongodb` as appropriate.
- The `metrics.serviceMonitor.namespace: monitoring` setting requires the Prometheus Operator (and a Prometheus instance configured to watch that namespace) to be installed in the cluster; otherwise the ServiceMonitor will be created but ignored. This is implicit in the post.

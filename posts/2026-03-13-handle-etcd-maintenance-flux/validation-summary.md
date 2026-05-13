# Validation Summary: How to Handle etcd Maintenance with Flux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- etcd
- etcdctl and etcdutl
- Kubernetes
- Kubernetes CronJob
- Flux CD v2
- GitOps operations
- AWS S3 CLI for off-cluster snapshot storage

## Sources Consulted
- etcd v3.6 maintenance guide: https://etcd.io/docs/v3.6/op-guide/maintenance/
- etcd v3.6 system limits: https://etcd.io/docs/v3.6/dev-guide/limit/
- etcd v3.6 snapshot guide: https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- etcd v3.6 configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Flux CLI suspend documentation: https://fluxcd.io/flux/cmd/flux_suspend/
- Flux CLI resume documentation: https://fluxcd.io/flux/cmd/flux_resume/
- Flux get all documentation: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The description and introduction said the post covered backup/restore and a critical restore workflow, but the post does not include a restore workflow. I narrowed the wording to backups and restore-specific suspension guidance.
- The introduction said Flux must be suspended during backup and restore. Backups do not require Flux suspension; restore operations are the case where reconciliation can interfere with restored state. I corrected the wording.
- The defragmentation explanation said each member is taken offline. Official etcd docs state live defragmentation blocks reads and writes on the member while rebuilding state. I changed the description to match that behavior.
- The snapshot verification command used `etcdctl snapshot status`. In current etcd documentation, snapshot status is shown with `etcdutl`; `etcdctl snapshot status` is deprecated in etcdctl 3.5. I changed verification to `etcdutl snapshot status` and added `etcdutl` to prerequisites.
- The snapshot command used the general `$ETCD_ENDPOINTS` variable. Official etcd snapshot documentation states snapshot save should use one endpoint. I added a single `SNAPSHOT_ENDPOINT` variable for the backup example.
- The Flux-managed CronJob used `registry.k8s.io/etcd:3.5.12-0` with a shell script requiring `jq` and `date`; that image does not include those utilities. I changed the example to a purpose-built maintenance image and noted that it must include `etcdctl`, `jq`, `date`, and `/bin/sh`.
- The CronJob compact and snapshot commands omitted `--endpoints`, causing them to fall back to the default non-TLS endpoint. I added an `ETCD_ENDPOINTS` environment variable and passed it consistently.
- The CronJob could overlap if a previous maintenance job was still running. I added `concurrencyPolicy: Forbid`, which is supported by Kubernetes CronJob and is safer for etcd maintenance.
- The best-practices section described 8 GiB as the default quota. Official etcd docs state the default storage limit is 2 GiB and 8 GiB is a suggested maximum for normal environments. I corrected the alert guidance accordingly.

## Review Notes
The example still assumes a kubeadm-style control plane certificate layout under `/etc/kubernetes/pki/etcd` and a local etcd endpoint on `127.0.0.1:2379`. Managed Kubernetes services or distributions with different certificate paths, endpoint topology, or etcd operators will need adapted commands.

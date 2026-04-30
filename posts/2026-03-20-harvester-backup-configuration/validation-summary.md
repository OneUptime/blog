# Validation Summary: How to Back Up Harvester Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Kubernetes
- `kubectl`
- AWS CLI
- Amazon S3

## Sources Consulted
- Harvester Settings documentation: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester API index: https://docs.harvesterhci.io/v1.7/category/api/
- Harvester VM image API: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-image/
- Harvester SSH key API: https://docs.harvesterhci.io/v1.7/api/create-namespaced-key-pair/
- Harvester VM template version API: https://docs.harvesterhci.io/v1.7/api/list-namespaced-virtual-machine-template-version/
- Harvester cluster network documentation: https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester cluster network API: https://docs.harvesterhci.io/v1.7/api/read-cluster-network/
- Harvester node network API: https://docs.harvesterhci.io/v1.7/api/list-node-network/
- RKE2 backup and restore documentation: https://docs.rke2.io/datastore/backup_restore
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- AWS CLI `s3 cp` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI `s3 sync` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The post described several backup methods as `kubectl export`, which is not a current `kubectl` command. I changed those references to `kubectl get -o yaml` and clarified that the exported manifests need cleanup before re-application because they include server-managed fields.
- The RKE2 snapshot section included `cluster-init: true`, which is unrelated to configuring snapshots and unsafe to present as a generic backup setting. I removed it and corrected the explanation of scheduled snapshots and on-demand snapshot naming.
- The export script treated cluster-scoped Harvester resources as namespaced resources. I removed namespace flags from `settings.harvesterhci.io` and `nodenetworks`, and I changed the backup-target export to use the documented `settings.harvesterhci.io backup-target` resource.
- The certificate backup example attempted to fetch a Secret named `ssl-certificates`, but Harvester documents `ssl-certificates` as a `settings.harvesterhci.io` setting. I changed the backup example to export that setting instead.
- The export script appended multiple full YAML documents into the same files for template versions and node networks. I split those into separate files so the output stays valid and easier to inspect.
- The cron example scheduled `/opt/scripts/backup-k8s-resources.sh` without ever installing the script there, and it overwrote the existing crontab. I added an install step and changed the crontab example to append safely.
- The node backup script used `cat` with globs, which does not preserve filenames or directories and can collapse multiple files into unusable output. I replaced that with per-node tar archives and added `registries.yaml` because Harvester stores some node-level settings there.
- The node backup script saved `/var/lib/rancher/rke2/server/node-token`, but RKE2 restore-to-new-host documentation requires backing up `/var/lib/rancher/rke2/server/token`. I corrected the path.
- The restore section omitted the original RKE2 server token, which is required when restoring a snapshot onto replacement hardware. I added `--token="<BACKED-UP-TOKEN-VALUE>"`, corrected the snapshot naming example, and documented `--etcd-s3=false` for local restores when S3 config is present.
- The restore verification commands did not set `KUBECONFIG` and used `kubectl get vmi -A`, which is less appropriate for validating Harvester resource recovery. I set `KUBECONFIG=/etc/rancher/rke2/rke2.yaml` and switched the check to `kubectl get virtualmachines -A`.
- The backup verification script counted only top-level `kind: List` entries from `kubectl get -o yaml` output. I updated the pipeline so it counts the actual nested resource kinds.

## Review Notes
- The S3 configuration example is technically valid, but current RKE2 releases also support `etcd-s3-config-secret`, which is preferable when you do not want credentials stored directly in the RKE2 config file.
- Exported Kubernetes YAML is useful for inventory, documentation, and selective recreation, but the authoritative full-cluster recovery artifact remains the etcd snapshot plus the original RKE2 server token.

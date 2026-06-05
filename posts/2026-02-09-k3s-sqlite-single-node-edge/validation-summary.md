# Validation Summary: How to Configure K3s with SQLite Storage for Single-Node Edge Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- SQLite datastore
- Raspberry Pi / edge deployments
- Rancher local-path-provisioner
- Rancher Fleet
- Helm
- kube-apiserver and kubelet configuration
- Kubernetes audit logging

## Sources Consulted
- K3s Cluster Datastore documentation: https://docs.k3s.io/datastore
- K3s Backup and Restore documentation: https://docs.k3s.io/datastore/backup-restore
- K3s Requirements documentation: https://docs.k3s.io/installation/requirements
- K3s Configuration Options documentation: https://docs.k3s.io/installation/configuration
- K3s Server CLI documentation: https://docs.k3s.io/cli/server
- K3s Packaged Components documentation: https://docs.k3s.io/installation/packaged-components
- K3s Import Images documentation: https://docs.k3s.io/add-ons/import-images
- K3s Air-Gap Install documentation: https://docs.k3s.io/installation/airgap
- K3s Manual Upgrades documentation: https://docs.k3s.io/upgrades/manual
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes Reserve Compute Resources documentation: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Logging Architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Rancher local-path-provisioner documentation: https://github.com/rancher/local-path-provisioner
- Rancher Fleet installation documentation: https://fleet.rancher.io/how-tos-for-operators/installation
- Rancher Fleet cluster registration documentation: https://fleet.rancher.io/how-tos-for-operators/cluster-registration

## Issues Found
- The minimum hardware section listed 512MB RAM and 1 CPU core for this single-node K3s server use case. Current K3s requirements list 2 CPU cores and 2GB RAM for server nodes, so the post was updated to distinguish server requirements from agent-only requirements.
- The architecture list used `ARM32v7`, but current K3s documentation lists `armhf`, `arm64/aarch64`, and `x86_64`. The architecture list was corrected.
- The SQLite backup description said backup and restore were a single-file operation, and the script copied only `state.db`. K3s documents backing up `/var/lib/rancher/k3s/server/db/` and the server token, so the backup and restore commands now archive and restore the datastore directory and preserve the token/config backup.
- The datastore verification command used `cat` on the SQLite database file, which would print binary data. It was changed to list the database file and query it with `sqlite3`.
- The low-resource tuning section used `watch-cache-sizes` as if non-zero values reduce cache sizes. Current kube-apiserver documentation states non-zero values are equivalent and only zero disables watch caching for that resource, so that flag and the related explanation were removed.
- The resource-reservation snippet appended a second `kubelet-arg` key to the same YAML file, which could overwrite earlier list values. It now uses a K3s config drop-in with `kubelet-arg+`.
- The Fleet section showed an unsupported hand-written Deployment and an incorrect bootstrap Secret. It was replaced with the documented Helm installation, `ClusterRegistrationToken`, values extraction, and Fleet agent Helm install flow.
- The local-path-provisioner install command used an older manifest version than current upstream stable documentation. It was updated to the current stable manifest URL.
- The log rotation section configured `logrotate` for an incorrect pod log glob and bypassed Kubernetes' normal container log rotation mechanism. It now configures kubelet container log rotation via K3s kubelet arguments.
- The offline operations section referenced a non-existent `k3s-airgap-images.sh` command and used bare `crictl`. It now uses K3s' documented image import directory and `k3s crictl`.
- The security section enabled an audit log without an audit policy file, which would not log events. It now creates a minimal audit policy and passes both `audit-policy-file` and `audit-log-path`.
- The security section appended duplicate top-level YAML keys to the main config file. It now uses a K3s config drop-in with append semantics.
- The database corruption section restored from `state-latest.db`, which the backup script never created. It now restores from the timestamped datastore archive created by the backup script.

## Review Notes
- The guide still uses kubelet command-line arguments because that matches the existing post style and is supported by K3s, but Kubernetes marks many kubelet flags as deprecated in favor of kubelet configuration files. A future improvement would be to move advanced kubelet tuning into KubeletConfiguration drop-ins for K3s versions that support them.
- The upgrade command now uses a `vX.Y.Z+k3s1` placeholder to avoid pinning the article to an unsupported or stale Kubernetes minor version.

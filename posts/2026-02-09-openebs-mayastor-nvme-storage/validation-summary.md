# Validation Summary: How to Configure OpenEBS Mayastor for NVMe-Based Storage on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenEBS Replicated PV Mayastor
- Kubernetes
- Helm
- CSI persistent volumes and snapshots
- NVMe-oF TCP
- SPDK
- Prometheus and Prometheus Operator resources
- fio benchmarking

## Sources Consulted
- OpenEBS Helm repository documentation: https://openebs.github.io/mayastor-extensions/
- OpenEBS Replicated PV Mayastor prerequisites: https://openebs.io/docs/main/quickstart-guide/prerequisites
- OpenEBS Replicated PV Mayastor DiskPool documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS Replicated PV Mayastor StorageClass documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS Replicated PV Mayastor StorageClass parameters: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-storage-class-parameters
- OpenEBS Replicated PV Mayastor topology parameters: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-topology-parameters
- OpenEBS Replicated PV Mayastor kubectl plugin documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/kubectl-plugin
- OpenEBS Replicated PV Mayastor replica rebuild documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/replica-rebuilds
- OpenEBS Replicated PV Mayastor monitoring documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/monitoring
- OpenEBS Replicated PV Mayastor volume snapshots documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/volume-snapshots
- OpenEBS Replicated PV Mayastor snapshot restore documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/snapshot-restore
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes CSI volume snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The Helm install instructions used the older Mayastor-specific chart repository and `mayastor` namespace. Updated the commands to use the current `openebs/openebs` chart from `https://openebs.github.io/openebs` and the `openebs` namespace.
- The DiskPool manifests used `openebs.io/v1alpha1` and raw `/dev/nvme0n1` paths. Updated them to `openebs.io/v1beta3` and URI-form `aio:///dev/disk/by-id/...` device references, matching current OpenEBS guidance.
- The prerequisites used the kernel module spelling `nvme_tcp` and disabled SELinux as a blanket step. Updated the module to `nvme-tcp` and replaced the SELinux command with the required kubelet restart/reboot note after HugePages changes.
- The StorageClass examples included `ioTimeout`, which is not listed in the current Mayastor StorageClass parameter documentation. Removed it from examples and parameter explanations.
- The replica management commands used unsupported `kubectl mayastor volume rebuild` and `volume status` forms. Replaced them with documented `kubectl mayastor get volumes`, `get volume`, `get volume-replica-topology`, and `get rebuild-history` commands.
- The monitoring section referenced obsolete metric names such as `mayastor_pool_capacity_bytes` and `mayastor_volume_read_ops_total`. Updated them to documented pool and volume metric names such as `disk_pool_total_size_bytes`, `disk_pool_used_size_bytes`, `volume_num_read_ops`, and `volume_bytes_read`.
- The alert examples referenced replica-state metrics that are not in the current monitoring documentation. Updated the example to alert on `disk_pool_status` and the documented disk-pool capacity metrics.
- Troubleshooting examples still referenced the old namespace and older plugin command forms. Updated them to use `openebs` and current `kubectl mayastor get ...` command forms.
- The high availability StorageClass used a non-documented Mayastor `topology` parameter and Kubernetes `allowedTopologies` for replica placement. Replaced it with documented Mayastor node labels and the `nodeSpreadTopologyKey` parameter.

## Review Notes
- The post is now technically consistent with the current OpenEBS 4.4.x documentation checked on 2026-06-04.
- The examples still assume the Mayastor kubectl plugin is installed when running `kubectl mayastor ...` commands.
- The ServiceMonitor selector follows the OpenEBS documentation example, but production clusters should confirm the installed chart's actual service labels before applying it.

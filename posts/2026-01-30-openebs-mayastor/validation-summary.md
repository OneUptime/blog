# Validation Summary: How to Create OpenEBS Mayastor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenEBS Replicated PV Mayastor
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, StatefulSets, and CSI snapshots
- Helm
- NVMe-oF TCP and Linux `nvme-tcp`
- SPDK
- Prometheus Operator ServiceMonitor
- PostgreSQL container deployment on Kubernetes

## Sources Consulted
- OpenEBS Replicated PV Mayastor prerequisites: https://openebs.io/docs/main/quickstart-guide/prerequisites
- OpenEBS installation guide: https://openebs.io/docs/quickstart-guide/installation
- OpenEBS Replicated PV Mayastor DiskPool documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS Replicated PV Mayastor StorageClass documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS Replicated PV Mayastor StorageClass parameters: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-storage-class-parameters
- OpenEBS kubectl Mayastor plugin documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/kubectl-plugin
- OpenEBS monitoring documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/advanced-operations/monitoring
- OpenEBS monitoring add-on documentation: https://openebs.io/docs/main/user-guides/observability
- OpenEBS Helm chart metadata and values: https://github.com/openebs/openebs/tree/HEAD/charts
- Mayastor Helm chart templates for io-engine, CSI controller, and metrics exporter service: https://github.com/openebs/mayastor-extensions/tree/develop/chart/templates
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes volume snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- SPDK documentation: https://spdk.io/doc/
- NVM Express specifications: https://nvmexpress.org/specifications/

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because the `--short` flag is no longer available in current kubectl releases.
- Updated the Kubernetes requirement from a hardcoded Kubernetes 1.25 statement to OpenEBS' documented Kubernetes 1.23+ support and kept the worker-node verification command.
- Corrected hugepage guidance from 2048 2 MiB pages to OpenEBS' documented minimum of 1024 2 MiB pages, and added the required kubelet restart or node reboot note after changing hugepages.
- Added `loki.enabled=false` to the lean Mayastor-only Helm example because the current OpenEBS chart enables Loki by default unless disabled.
- Fixed io-engine and CSI controller label selectors from non-current labels to the labels used by the Mayastor Helm chart templates.
- Updated DiskPool examples from `openebs.io/v1beta2` to `openebs.io/v1beta3`, switched raw device paths to stable `/dev/disk/by-id/...` links, and added `maxExpansion` because current OpenEBS docs recommend choosing this at pool creation.
- Updated DiskPool verification commands and sample output to use `kubectl get dsp -n openebs` and current status columns.
- Removed unsupported / undocumented Mayastor StorageClass parameters `ioTimeout` and deprecated `local`.
- Renamed the single-replica StorageClass section to avoid implying the deprecated `local` StorageClass behavior.
- Added `PGDATA: /var/lib/postgresql/data/pgdata` to the PostgreSQL example so the official PostgreSQL image initializes in a subdirectory on a mounted volume.
- Replaced the unsupported hugepage sizing formula with the documented Mayastor minimum and workload caveat.
- Corrected the ServiceMonitor selector to match the Mayastor metrics exporter service label and replaced incorrect `mayastor_*` metric names with documented `disk_pool_*` metrics.
- Replaced an unverified Grafana dashboard ID with the documented OpenEBS monitoring add-on / repository dashboard guidance.
- Replaced `kubectl mayastor get volumes --output wide` with `kubectl mayastor get volumes -o json`, matching the plugin's documented output options.

## Review Notes
- Helm and kubectl were not installed in the local environment, so CLI behavior was verified against official documentation and upstream chart templates rather than local `--help` output.
- The post is now accurate for the current OpenEBS 4.5.x / Mayastor 2.x documentation, but Mayastor chart defaults and metrics can change across OpenEBS minor releases. Future updates should re-check the OpenEBS chart values and Mayastor StorageClass parameter documentation.

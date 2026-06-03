# Validation Summary: How to Use Volume Snapshots for Development Environment Seeding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CSI VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass
- PersistentVolumeClaim data sources and dataSourceRef
- Gateway API ReferenceGrant
- Kubernetes CronJob and Job
- kubectl
- PostgreSQL
- Bash

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Persistent Volumes documentation, including dataSourceRef and cross-namespace data sources: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CSI cross-namespace data sources documentation: https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html
- Gateway API ReferenceGrant specification: https://gateway-api.sigs.k8s.io/reference/spec/

## Issues Found
- PVC restore examples used `dataSource` with `kind: VolumeSnapshotContent`. Kubernetes PVC `dataSource` supports `VolumeSnapshot` or PVC, not `VolumeSnapshotContent`. Updated the restore examples to use `dataSourceRef` pointing to the production `VolumeSnapshot` with a namespace.
- Cross-namespace snapshot restore examples did not grant access from the development namespace to the production snapshot. Added `ReferenceGrant` manifests in the production namespace for the examples that use cross-namespace `dataSourceRef`.
- The post implied cross-namespace restore would work by referencing the bound `VolumeSnapshotContent`. Added a note that cross-namespace volume data sources require the `CrossNamespaceVolumeDataSource` feature gate and the Gateway API `ReferenceGrant` CRD.
- The PostgreSQL sanitization job used `crypt()` and `gen_salt()` without enabling `pgcrypto`. Added `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
- The PostgreSQL verification command used `psql -t`, which can include whitespace in the count output. Changed it to `psql -At` for a clean numeric result.
- The multi-developer script used the raw developer name in Kubernetes namespace, label, and ReferenceGrant names, which can fail for uppercase names, spaces, or other invalid characters. Added slug normalization and validation before constructing Kubernetes resource names.
- The cleanup CronJob piped pretty-printed JSON objects from `jq` into a line-oriented `while read` loop, which would not parse each namespace as a complete object. Replaced it with a `kubectl -o jsonpath` loop and shell parsing, removing the unverified `jq` runtime dependency.

## Review Notes
Cross-namespace volume data sources are still documented as alpha in Kubernetes, so these examples depend on cluster feature gates and CSI provisioner support. The examples remain illustrative and also depend on the named CSI snapshot class, storage class, database service, credentials secret, and schema existing in the target cluster.

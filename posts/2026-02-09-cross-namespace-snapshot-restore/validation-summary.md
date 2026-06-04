# Validation Summary: How to Configure Cross-Namespace Volume Snapshot Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PersistentVolumeClaim
- CSI VolumeSnapshot and VolumeSnapshotContent
- Cross-namespace volume data sources
- Gateway API ReferenceGrant
- kubectl
- Kubernetes RBAC
- Bash scripting

## Sources Consulted
- Kubernetes documentation: Volume Snapshots - https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes documentation: Persistent Volumes, Volume Snapshot restore, dataSourceRef, and cross namespace data sources - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes CSI Developer Documentation: Cross-namespace storage data sources - https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html
- Kubernetes API reference: PersistentVolumeClaim v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/
- Gateway API documentation: ReferenceGrant - https://gateway-api.sigs.k8s.io/api-types/referencegrant/

## Issues Found
- The post incorrectly described cross-namespace snapshot restore as creating a PVC whose `dataSource` references a `VolumeSnapshotContent`. Kubernetes PVC `dataSource` supports VolumeSnapshot and PVC references, and cross-namespace restore uses `dataSourceRef` with a namespace. I updated the explanation and examples to use `dataSourceRef` pointing to the source `VolumeSnapshot`.
- The post omitted the required cross-namespace authorization model. I added ReferenceGrant resources in the source namespace for the basic restore, automation script, environment promotion workflow, and disaster recovery script.
- The post did not mention required feature gates and components for cross-namespace volume data sources. I added the requirement for `AnyVolumeDataSource`, `CrossNamespaceVolumeDataSource`, CSI external provisioner support, Gateway API ReferenceGrant CRD, and CSI snapshot restore support.
- The "VolumeSnapshot reference in target namespace" example attempted to reuse a dynamically bound `VolumeSnapshotContent` as if it could be rebound in another namespace. I changed the section to directly reference the source `VolumeSnapshot` through `dataSourceRef` after creating a ReferenceGrant.
- The PostgreSQL test data command mixed `psql -c` SQL with the `\c` meta-command. I split it into separate commands so database creation and table population execute correctly.
- The environment promotion PVC manifest had an indentation error in the corrected `resources.requests` block. I fixed the YAML indentation.
- The disaster recovery script used a field selector for `spec.source.persistentVolumeClaimName`, which is not a reliable supported field selector for custom VolumeSnapshot resources. I changed the script to filter the JSON output with `jq`, and guarded against `null` snapshot results.
- RBAC did not grant permission to create ReferenceGrant resources after the corrected cross-namespace flow. I added `gateway.networking.k8s.io` `referencegrants` permissions.

## Review Notes
Cross-namespace volume data sources are still documented by Kubernetes as an alpha feature as of the official documentation consulted on 2026-06-04. The examples are now technically aligned with Kubernetes documentation, but they require a cluster and CSI provisioner configured for that alpha feature.

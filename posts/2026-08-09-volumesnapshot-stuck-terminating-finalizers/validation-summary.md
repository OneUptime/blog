# Validation Summary: VolumeSnapshot Stuck in Terminating: How to Diagnose Finalizers Before Removing Them

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- Kubernetes external-snapshotter v8.6.0
- `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`
- `VolumeGroupSnapshot`
- PersistentVolumeClaims and snapshot restores
- Kubernetes finalizers, events, RBAC, and Secrets
- `kubectl`, `jq`, and `rg`

## Sources Consulted

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes PersistentVolumeClaim API](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes `kubectl delete` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
- [Kubernetes Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes CSI Snapshot Controller documentation](https://kubernetes-csi.github.io/docs/snapshot-controller.html)
- [Kubernetes CSI Cross-Namespace Data Sources](https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html)
- [external-snapshotter v8.6.0 release](https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v8.6.0)
- [external-snapshotter v8.6.0 changelog](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.6.0/CHANGELOG/CHANGELOG-8.6.md)
- [external-snapshotter v8.6.0 finalizer and annotation constants](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.6.0/pkg/utils/util.go)
- [external-snapshotter v8.6.0 common snapshot controller](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.6.0/pkg/common-controller/snapshot_controller.go)
- [external-snapshotter v8.6.0 sidecar controller](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.6.0/pkg/sidecar-controller/snapshot_controller.go)
- [external-snapshotter v8.6.0 group snapshot controller helper](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.6.0/pkg/sidecar-controller/groupsnapshot_helper.go)
- [CSI `DeleteSnapshot` specification](https://github.com/container-storage-interface/spec/blob/master/spec.md#deletesnapshot)
- [Kubernetes 1.36 VolumeGroupSnapshot GA announcement](https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/)

## Issues Found

- The bound-protection finalizer was described as applying only to dynamically bound snapshots. Changed it to cover any bound snapshot whose matching content has `deletionPolicy: Delete`, because the common controller applies it to both dynamically provisioned and pre-provisioned bindings.
- The normal deletion chain was stated for every `Delete` snapshot. Qualified it as the independent, non-group-member path because CSI group members are deleted through `DeleteVolumeGroupSnapshot`, not individual `DeleteSnapshot` calls.
- The sidecar was said to clear “snapshot status” after provider deletion. Clarified that it clears snapshot-related fields in `VolumeSnapshotContent.status`; it does not directly clear `VolumeSnapshot.status`.
- The log instructions claimed to include logs from before a restart, but the commands read only the current container instance. Changed the wording and added the required `--previous` instruction for the immediately previous instance.
- The all-namespace event filter formed an empty regular-expression alternative when `snapshot_content` was unset, causing `rg` to match every line. Made the content-name branch conditional so the filter remains selective when status has no bound content name.
- The force-delete warning could imply that `--force --grace-period=0` bypasses finalizers. Clarified that these flags do not remove finalizers from an ordinary `VolumeSnapshot` and do not perform backend storage cleanup.

## Review Notes

- All Bash and Zsh snippets parse successfully, and every `jq` filter was executed against representative objects with jq 1.6. The `kubectl` resources, JSONPath expressions, field selectors, log flags, patch flags, and status fields match the current APIs and command references.
- external-snapshotter v8.6.0 specifically fixed deletion requeue behavior for pending PVC restores and deletion requested while `CreateSnapshot` is in flight. Older controller releases can behave differently, so the post's instruction to use version-matched documentation remains important.
- Volume group snapshots are GA in Kubernetes 1.36, but availability still depends on installed APIs/controllers and CSI driver support. The post correctly treats group behavior as deployment- and version-dependent.
- Cross-namespace data sources remain an optional alpha path with additional feature-gate and `ReferenceGrant` requirements. The shown PVC query covers the normal same-namespace path; clusters enabling cross-namespace sources must audit references according to their exact provisioner and control-plane versions.
- The finalizer merge patch preserves finalizers present in its initial read, but replacing a list is not an atomic compare-and-remove operation. It remains appropriate only for the documented last-resort, audited workflow; concurrent controller reconciliation can make the patch fail and require a fresh read.
- Sorting Events by `.lastTimestamp` is valid for events emitted by the current external-snapshotter recorder, although that field is legacy and can be empty for newer event producers.

# Validation Summary: How to Troubleshoot PVC Binding Issues in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- PersistentVolumeClaims (PVCs)
- PersistentVolumes (PVs)
- StorageClass
- `kubectl`
- Bash
- Python 3

## Sources Consulted
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes API types (`PersistentVolumeClaimPhase`): https://github.com/kubernetes/api/blob/master/core/v1/types.go
- Kubernetes PVC validation logic (`ValidatePersistentVolumeClaimUpdate`): https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/core/validation/validation.go
- Portainer Kubernetes Volumes docs: https://docs.portainer.io/user/kubernetes/volumes
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API docs: https://docs.portainer.io/api/docs
- Amazon EKS StorageClass parameters reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html

## Issues Found
- The post listed `Released` as a PVC state. Kubernetes defines PVC phases as `Pending`, `Bound`, and `Lost`; `Released` is a PV phase. I changed the state list to use `Lost`.
- The post advised changing an existing PVC's `storageClassName` with `kubectl patch pvc`. Kubernetes validates PVC specs as immutable after creation aside from limited exceptions, so I replaced that guidance with deleting the unbound Pending claim and reapplying the manifest with the corrected `storageClassName`.
- The example StorageClass used the in-tree AWS provisioner `kubernetes.io/aws-ebs`, which Kubernetes deprecated in v1.19 and removed in v1.27. I updated the example to `ebs.csi.aws.com` and added `volumeBindingMode: WaitForFirstConsumer` to reflect current CSI-based guidance.
- The access-mode troubleshooting note said to check access modes "per storage class". Access modes are tied to the PV and underlying storage backend or CSI driver capabilities, so I corrected the wording to refer to the storage backend or driver.
- I tightened two smaller wording issues for accuracy: `Bound` now says "bound to a PV" instead of "attached", and the `WaitForFirstConsumer` explanation now references a Pod that uses the PVC being created and scheduled.

## Review Notes
- Portainer documentation confirms the `Kubernetes > Volumes` navigation path and the use of `X-API-Key` for API access.
- The Portainer API example's Kubernetes proxy path is consistent with Portainer's documented API-gateway behavior plus the standard Kubernetes API path structure. That specific PVC path is an inference from the docs rather than an explicitly documented Portainer example.
- The `hostPath` PV example remains appropriate only for testing or single-node scenarios, and the post already labels it accordingly.

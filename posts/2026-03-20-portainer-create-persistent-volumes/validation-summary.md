# Validation Summary: How to Create Persistent Volumes in Portainer via Manifest - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- PersistentVolume (PV)
- PersistentVolumeClaim (PVC)
- StorageClass
- NFS storage
- Local PersistentVolumes
- `kubectl`

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Portainer Kubernetes "Add a new application using code": https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer Kubernetes "Create an application from a Manifest": https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create

## Issues Found
- The storage concepts section described a PersistentVolume as something an administrator creates. I corrected that to match Kubernetes documentation, which defines PVs as either statically created or dynamically provisioned.
- The access mode descriptions were tightened to use the current Kubernetes wording about how volumes are mounted by nodes.
- The `hostPath` example implied it was suitable for general testing environments. I corrected this to single-node testing environments, which matches the Kubernetes documentation warning that `hostPath` PVs do not work in multi-node clusters.
- The PVC expansion example showed an incomplete manifest. I updated it to keep the PVC's existing `accessModes` and `storageClassName`, because resizing is done by editing the existing PVC object rather than applying an incomplete replacement manifest.
- The retained-volume reclaim example did not mention that data remains on the backing storage. I updated the text to require verifying or cleaning retained data before clearing `claimRef` so the PV can be rebound safely.

## Review Notes
- The post is technically correct after the above fixes.
- `ReadWriteOncePod` is also a stable Kubernetes access mode in current releases, but its omission here does not make the post incorrect because the examples use `ReadWriteOnce` and `ReadWriteMany`.
- The local PersistentVolume example is valid. In real deployments, pairing local storage with a StorageClass that uses `volumeBindingMode: WaitForFirstConsumer` is often recommended.

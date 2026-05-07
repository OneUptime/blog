# Validation Summary: How to Resize Persistent Volumes in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- PersistentVolumeClaims (PVCs)
- PersistentVolumes (PVs)
- StorageClass
- CSI drivers
- kubectl
- Bash

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes blog, "Kubernetes 1.24: Volume Expansion Now A Stable Feature": https://kubernetes.io/blog/2022/05/05/volume-expansion-ga/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Rancher "How Persistent Storage Works": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/about-persistent-storage
- Rancher "Dynamically Provisioning New Storage in Rancher": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/dynamically-provision-new-storage

## Issues Found
- The post said it explained how to resize PVs, but the supported workflow is to resize the PVC and let Kubernetes expand the backing volume. I corrected the wording to describe PVC-backed volume expansion accurately.
- The CSI verification command used `.spec.requiresRepublish`, which is not a resize capability indicator. I replaced it with a driver-listing command and clarified that expansion support must be confirmed in the CSI driver's documentation.
- The "current size" example only showed the requested size. I updated it to show both the requested size and the current PVC capacity.
- The Rancher UI step used an unverified navigation path and a generic "Capacity" field. I updated it to use Rancher's documented `Explore` flow and the actual `spec.resources.requests.storage` field.
- The resize-status examples were inaccurate: `Resizing` is a temporary condition, while `FileSystemResizePending` indicates pending filesystem work. I corrected the examples and the completion description.
- The restart guidance implied pod restarts were generally required. I narrowed it to the `FileSystemResizePending` case, which matches current in-use PVC expansion behavior.
- The StatefulSet restart loop waited on a pod name immediately after deletion without also waiting for creation. I updated it to wait for both creation and `Ready`.
- The monitoring section claimed to automate resizing, but the script only reported candidates. I renamed it to monitoring and adjusted the script to more reliably find pods and collect filesystem usage.
- The failure-handling section assumed a generic CSI controller label and used a brittle PVC conditions command. I replaced that with a driver-agnostic discovery step and a JSON output form suitable for `jq`.

## Review Notes
- Rancher UI navigation differs across versions; the edited step now uses the documented `Explore` flow and notes the current PVC list location in recent versions.
- The monitoring script assumes the filesystem is mounted at `/data` and that `jq` is available where the script is run.
- I did not execute the Kubernetes commands because no cluster context was provided; the review was documentation-based.

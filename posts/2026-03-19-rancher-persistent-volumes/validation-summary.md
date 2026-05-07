# Validation Summary: How to Configure Persistent Volumes in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes Persistent Volumes (PV)
- Kubernetes Persistent Volume Claims (PVC)
- Kubernetes StorageClass
- Kubernetes StatefulSet
- kubectl

## Sources Consulted
- Rancher Manager persistent storage overview: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-admin/manage-clusters/persistent-storage/manage-persistent-storage.html
- Rancher Manager existing storage workflow and UI path: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/cluster-admin/manage-clusters/persistent-storage/set-up-existing-storage.html
- Rancher dynamic storage workflow and supported/archived version selector: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/dynamically-provision-new-storage
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The prerequisite `Rancher v2.6 or later` was outdated. I changed it to a supported Rancher Manager release example (`v2.10 or later`) because current Rancher docs mark `v2.6` through `v2.9` as archived.
- The static PV/PVC example could fail on clusters with a default StorageClass because the claim did not explicitly opt out of default class assignment. I added `storageClassName: ""` to both the PV and PVC so the static claim can bind correctly.
- The `hostPath` example was too broad for Rancher and Kubernetes. I clarified that `hostPath` is only suitable for single-node testing and added the Rancher-specific note that the path must be exposed to kubelet through the required extra bind.
- The Rancher UI navigation was underspecified and one menu label was inaccurate. I updated the workflow to use `Cluster Management` > cluster > `Explore`, and corrected the PVC resource label to `Persistent Volume Claims`.
- The PVC UI guidance implied leaving the default StorageClass in place for a static PV workflow. I changed it to leave StorageClass empty for a static PV and only select a StorageClass for dynamic provisioning.
- The access mode explanations were incomplete. I clarified that `ReadWriteOnce` is a single-node access mode, not a single-pod guarantee, and that `ReadWriteOncePod` is CSI-only.
- The reclaim policy explanation for `Recycle` was incomplete. I updated it to reflect the current Kubernetes guidance that `Recycle` is deprecated and only `nfs` and `hostPath` support it in current releases.
- The StatefulSet example omitted the required headless Service referenced by `serviceName`. I added the Service manifest so the example is complete and aligns with Kubernetes StatefulSet requirements.
- The monitoring example used a placeholder pod name that was not directly runnable. I changed it to `kubectl exec deployment/app-with-storage -- ...`, which is supported by current kubectl.
- The troubleshooting note for a PV stuck in `Released` was too loose. I updated it to reflect manual reclamation of the underlying storage or deleting and recreating the PV.

## Review Notes
- The post is technically relevant and salvageable; no removal recommendation is needed.
- The `nginx:latest` image tag is technically valid, but pinning a specific tag would be more reproducible in a future revision.
- The StatefulSet example still relies on either a default StorageClass or matching pre-provisioned PVs for the generated PVCs to bind successfully, which is consistent with Kubernetes behavior.

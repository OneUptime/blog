# Validation Summary: How to Disable Local Storage in K3s

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes persistent storage (PV, PVC, StorageClass)
- Rancher Local Path Provisioner
- Longhorn
- NFS CSI Driver
- OpenEBS Local PV Hostpath
- Helm

## Sources Consulted
- K3s docs: Managing Packaged Components - https://docs.k3s.io/installation/packaged-components
- K3s docs: Configuration Options - https://docs.k3s.io/installation/configuration
- K3s docs: Server CLI - https://docs.k3s.io/cli/server
- K3s docs: Volumes and Storage - https://docs.k3s.io/add-ons/storage
- Kubernetes docs: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes blog: Local Persistent Volumes for Kubernetes Goes Beta - https://kubernetes.io/blog/2018/04/13/local-persistent-volumes-beta/
- Longhorn docs: Install Longhorn on Kubernetes - https://longhorn.io/docs/latest/deploy/install/
- Longhorn docs: Customizing Default Settings - https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn docs: Accessing the UI - https://longhorn.io/docs/latest/deploy/accessing-the-ui/
- NFS CSI Driver chart docs - https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts/README.md
- NFS CSI Driver dynamic provisioning example - https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/deploy/example/README.md
- OpenEBS installation docs - https://openebs.io/docs/main/quickstart-guide/installation
- OpenEBS Local PV Hostpath overview - https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-hostpath/hostpath-overview
- OpenEBS Local PV Hostpath StorageClass docs - https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-hostpath/configuration/hostpath-create-storageclass

## Issues Found
- The post said a pod rescheduled to a different node "loses access" to its PersistentVolume. I corrected this to explain that local PVs are node-bound and workloads become unavailable if the original node or disk is unavailable, which matches Kubernetes local volume behavior.
- The existing-cluster snippet used `echo >> /etc/rancher/k3s/config.yaml`, which could fail without elevated permissions and could lead to unsafe config edits. I replaced it with a K3s drop-in file using `disable+` so `local-storage` is appended without overwriting existing settings.
- The Longhorn prerequisites omitted packages that current Longhorn documentation checks for on Debian and Ubuntu systems. I updated the package list to include `cryptsetup` and `dmsetup`.
- The Longhorn readiness and test commands were too optimistic. I replaced the single deployment rollout check with `kubectl wait` for pods, and added a readiness wait before `kubectl exec` in the storage test.
- The NFS section installed the NFS CSI driver but called it a storage provisioner. I renamed the section to `NFS CSI Driver` and added `allowVolumeExpansion: true` to align with the official dynamic provisioning example.
- The OpenEBS section used the deprecated Helm repo `https://openebs.github.io/charts`, outdated chart values, and an incomplete manual StorageClass example. I updated it to the current OpenEBS repo and chart values, and switched verification to the default `openebs-hostpath` StorageClass created by OpenEBS.
- The OpenEBS description claimed snapshot support for the example, but the example was Hostpath local storage, not a snapshot-capable OpenEBS LVM workflow. I corrected the wording to make clear it remains node-local.
- The conclusion implied every replacement option provides replication. I changed it to say the underlying storage backend must meet the required availability and durability goals, which is accurate for NFS and local PV options.

## Review Notes
- Longhorn's current chart defaults use 3 replicas for the default StorageClass. The post intentionally sets 2 replicas, which can be appropriate for smaller clusters but should be chosen based on node count and failure tolerance.
- The OpenEBS option remains local storage. It is a Kubernetes-native local PV alternative, but it does not solve the same single-node availability problem that Longhorn or an HA NFS backend addresses.
- The NFS CSI driver provides Kubernetes integration for NFS storage, but replication and high availability depend on the backing NFS service, not on the CSI driver itself.

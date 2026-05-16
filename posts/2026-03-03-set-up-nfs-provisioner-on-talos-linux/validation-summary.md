# Validation Summary: How to Set Up NFS Provisioner on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Kubernetes NFS CSI driver
- NFS Ganesha server and external provisioner
- Helm
- NFS mount options

## Sources Consulted
- Kubernetes CSI NFS driver Helm chart documentation: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts/README.md
- Kubernetes CSI NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- NFS Ganesha server and external provisioner Helm chart values: https://github.com/kubernetes-sigs/nfs-ganesha-server-and-external-provisioner/blob/master/charts/nfs-server-provisioner/values.yaml
- NFS Ganesha server and external provisioner StorageClass template: https://github.com/kubernetes-sigs/nfs-ganesha-server-and-external-provisioner/blob/master/charts/nfs-server-provisioner/templates/storageclass.yaml
- NFS Ganesha server and external provisioner StatefulSet template: https://github.com/kubernetes-sigs/nfs-ganesha-server-and-external-provisioner/blob/master/charts/nfs-server-provisioner/templates/statefulset.yaml
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Talos Linux storage guidance: https://docs.siderolabs.com/kubernetes-guides/csi/storage
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config

## Issues Found
- The NFS Ganesha provisioner values snippet omitted `storageClass.create`. The chart defaults it to `true`, but adding it makes the example explicit and matches the chart schema.
- The NFS Ganesha provisioner values used `nfsvers=4.1` and `noresvport` while the chart's documented default mount options use `vers=4.1`, `retrans=2`, and `timeo=30`. The snippet was corrected to use `vers=4.1` and avoid implying `noresvport` is part of the chart's default recommendation.
- The shared workload example always used `storageClassName: nfs-shared`, which only matches the external CSI driver example. A comment was added noting that users should use `nfs` when following the in-cluster provisioner path.
- The Talos NFS configuration section suggested loading `nfs` and `nfsd` kernel modules for NFSv4. Talos documentation says the NFS client is part of the Talos-maintained kubelet image, and `nfsd` is the kernel server module rather than a normal client requirement. The text was corrected to describe the kubelet image behavior and remove the misleading module patch.
- The monitoring command used `kubectl run` without mounting any NFS volume, so it would not show node-level NFS mounts. It was replaced with `kubectl debug node/<node-name>` and `/host/proc/mounts`, matching Kubernetes node-debug behavior.
- The summary said the NFS CSI driver handles dynamic provisioning for both external and in-cluster approaches. The in-cluster Ganesha option uses its own external provisioner, so the wording was generalized to Kubernetes dynamic provisioning through StorageClasses and PVCs.

## Review Notes
- Helm and kubectl were not installed in the local environment, so command verification was performed against official documentation and upstream chart templates rather than local CLI help output.
- The examples assume the referenced namespaces exist before applying workload manifests. Future edits could add namespace creation commands, but this was not required to correct the technical content.

# Validation Summary: How to Configure Windows Storage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes on Windows nodes
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- CSI drivers
- AWS EBS CSI driver
- SMB CSI driver
- Windows `hostPath` volumes

## Sources Consulted
- Kubernetes Windows Storage documentation: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Rancher local-path-provisioner README: https://github.com/rancher/local-path-provisioner
- Rancher local-path-provisioner deployment manifest: https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml
- AWS EBS CSI driver installation docs: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
- AWS EBS CSI driver Windows example: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/examples/kubernetes/windows
- Amazon EKS EBS CSI driver guide: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- SMB CSI driver README: https://github.com/kubernetes-csi/csi-driver-smb
- SMB CSI driver install docs: https://github.com/kubernetes-csi/csi-driver-smb/blob/master/docs/install-csi-driver-v1.20.1.md
- Microsoft Learn SQL Server container documentation: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver17

## Issues Found
- The post described Rancher `local-path-provisioner` as a Windows storage option. Upstream Rancher documentation and manifests document Linux paths, Linux shell scripts, and a BusyBox helper pod, not Windows support. I replaced that section with guidance to use Windows-capable CSI drivers instead.
- The prerequisites and limitations sections referred to NFS as available for Windows workloads. Kubernetes Windows storage documentation states that NFS-based storage/volume support is not supported on Windows nodes. I corrected the wording and support matrix.
- The supported volume list implied `hostPath` meant SMB/CIFS and included unsupported or unverified items as if they were first-class Windows options. I corrected the list to reflect Windows-compatible options documented by Kubernetes and the relevant CSI projects.
- The Windows workload example used `mcr.microsoft.com/mssql/server:2022-latest` under a Windows node selector. Microsoft documents `mcr.microsoft.com/mssql/server:*` as Linux container images only. I replaced the example with a valid Windows container image and PVC mount example.
- The AWS EBS install snippet used an unpinned `release-1.x` Kustomize reference and a generic grep-based verification command. I updated it to the current upstream stable overlay reference documented on 2026-04-23 and to the label-based verification command used by the project docs.
- The EBS `StorageClass` used `csi.storage.k8s.io/fstype: ntfs`. The upstream Windows example for the AWS EBS CSI driver uses `fstype: ntfs`. I aligned the manifest with the driver's documented Windows example.
- The EBS `StorageClass` also enabled `allowVolumeExpansion`, while Kubernetes Windows storage docs still document mounted filesystem expansion (`resizefs`) as unsupported on Windows. I removed that setting.
- The SMB install command was incorrect. The post attempted to apply `install-driver.sh` with `kubectl apply -f`, but the upstream docs install it by running the script. I replaced the command with the documented remote install command for v1.20.1 and split shell commands from YAML so both examples are syntactically correct.
- The `hostPath` `Deployment` manifest was invalid because it lacked the required `.spec.selector` and matching pod labels. I added the selector and labels and replaced the placeholder image with a real Windows container image so the example is runnable.

## Review Notes
- The post is now technically accurate as of 2026-04-23.
- The AWS EBS snippet is pinned to `release-1.59`, which was the current upstream stable install reference at review time; that version reference should be refreshed if the post is revisited later.
- The SMB CSI install command is pinned to `v1.20.1`, the current documented install version at review time.
- The AWS EBS example still requires AWS-specific prerequisites outside the YAML itself, especially IAM permissions for the driver and CSI Proxy availability on Windows nodes when not using HostProcess-based deployment.

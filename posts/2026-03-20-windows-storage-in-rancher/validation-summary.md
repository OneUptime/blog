# Validation Summary: How to Configure Windows Storage in Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Rancher (Kubernetes distribution)
- Kubernetes SMB CSI driver (`smb.csi.k8s.io`, kubernetes-csi/csi-driver-smb)
- Helm (for chart installation)
- Kubernetes StorageClass, PersistentVolumeClaim, Pod spec
- Windows containers in Kubernetes (Windows worker nodes)
- SMB/CIFS network file sharing
- hostPath volumes
- Azure Disk / Azure Files (comparison only)
- NFS (comparison only)

## Sources Consulted
- kubernetes-csi/csi-driver-smb GitHub repository: https://github.com/kubernetes-csi/csi-driver-smb
- csi-driver-smb Helm chart index: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts/index.yaml
- csi-driver-smb chart values.yaml: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts/latest/csi-driver-smb/values.yaml
- csi-driver-smb example StorageClass: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/deploy/example/storageclass-smb.yaml
- csi-driver-smb Windows example: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/deploy/example/windows/statefulset.yaml
- Kubernetes Windows in Kubernetes documentation: https://kubernetes.io/docs/concepts/windows/
- YAML 1.2 spec (scalar quoting rules)

## Issues Found

1. **NFS listed as not multi-node** — The comparison table stated `| NFS | No | Limited | ... |`, claiming NFS is not multi-node. NFS is inherently a network file sharing protocol and supports concurrent access from multiple clients (maps to `ReadWriteMany` in Kubernetes). Changed the Multi-Node column for NFS from `No` to `Yes`.

2. **Unquoted Windows backslash paths in YAML** — The post used `mountPath: C:\app\data`, `mountPath: C:\app\local`, and `path: C:\kubernetes\data` unquoted. While unquoted backslashes in YAML plain scalars are technically valid (treated literally), it is brittle and inconsistent with best practice. Quoted the three Windows paths with single quotes (`'C:\app\data'`, `'C:\app\local'`, `'C:\kubernetes\data'`) so backslashes are unambiguously preserved.

## Review Notes

- The Helm repo URL (`https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts`) and chart name (`csi-driver-smb/csi-driver-smb`) are current as of csi-driver-smb v1.20.1.
- The chart values `windows.enabled` and `linux.enabled` are correct top-level keys in the chart (verified against the chart's values.yaml). They control the Linux and Windows node DaemonSets respectively; both default to `true`.
- Setting `linux.enabled=false` is a legitimate choice when the cluster only needs SMB storage on Windows worker nodes (the CSI controller still runs on Linux control plane nodes). If Linux pods in the same cluster ever need SMB storage, re-enable this.
- The StorageClass `source` and `csi.storage.k8s.io/*-secret-name` / `-namespace` parameters match the upstream example exactly.
- The `mountOptions` (`dir_mode=0777`, `file_mode=0777`) are CIFS/Linux-style mount options. They are honored when Linux pods mount the SMB volume, but are effectively ignored for Windows pods (Windows mounts via native SMB stack). They are not harmful — left unchanged.
- Windows containers typically prefer forward-slash mount paths (e.g., `/mnt/data`) which Kubernetes translates; the post's Windows-style paths work but quoting is the right call.
- SMB CSI driver requires Windows worker nodes to have the SMB protocol features enabled, which is standard on Windows Server 2019+ SKUs commonly used with Rancher. Not called out in the post but assumed.


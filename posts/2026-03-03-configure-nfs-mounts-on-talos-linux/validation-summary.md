# Validation Summary: How to Configure NFS Mounts on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`v1alpha1` machine configuration)
- Linux NFS client (`nfs(5)` mount options)
- Kubernetes PersistentVolume / PersistentVolumeClaim / StorageClass with the `nfs` volume type
- NFS CSI driver (`csi-driver-nfs`, provisioner `nfs.csi.k8s.io`)
- NFSv3 and NFSv4.2 protocol differences
- Linux network sysctls (`net.core.rmem_max`, `net.ipv4.tcp_rmem`, etc.)

## Sources Consulted
- Talos `v1alpha1` config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos disk management / volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/
- `nfs(5)` man page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Kubernetes NFS volume / PersistentVolume reference: https://kubernetes.io/docs/concepts/storage/volumes/#nfs
- kubernetes-csi/csi-driver-nfs project: https://github.com/kubernetes-csi/csi-driver-nfs
- csi-driver-nfs Helm chart README: https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/charts

## Issues Found

1. **`machine.mounts` does not exist in the Talos machine config schema (critical).** The original post built an entire "System-Level NFS Mounts" section around a fabricated `machine.mounts` field with `source`/`destination`/`type: nfs`/`options:` keys. The Talos `v1alpha1` schema has no such field — the only mount-style entries are `machine.disks[].partitions[].mountpoint` (for local block devices) and `machine.kubelet.extraMounts` (OCI mounts for the kubelet container). Applying the original YAML would fail config validation, and Talos in any case does not ship `mount.nfs` userspace tooling for OS-level NFS mounting. **Fix:** Replaced the introductory paragraph and the "System-Level NFS Mounts", "Setting Up NFS for Multiple Nodes", and "Force NFSv3" sections with accurate guidance that NFS on Talos is exclusively consumed through Kubernetes (PV / CSI driver / inline pod volume), and recast all NFS mount-option examples as `PersistentVolume.mountOptions` or `StorageClass.mountOptions`.

2. **`noatime` listed as an NFS performance option (incorrect).** Per `nfs(5)`, `noatime` is a no-op on NFS — atime semantics are governed by the server. The original post called it out as a performance optimization. **Fix:** Removed `noatime` from the mount-option examples and added a note in the new "NFS Mount Options Reference" section explaining the no-op behavior.

3. **`machine.kernel.modules: [- name: nfs, - name: nfsd]` (misleading).** Talos's kernel image has the NFS client built in (auto-loaded by the kubelet on first mount), so this stanza is unnecessary. The `nfsd` server module is not shipped, so listing it is misleading. **Fix:** Renamed the section to "NFS Kernel Modules" and clarified that no module loading is required and that the in-kernel NFS server is not available on Talos.

4. **`--set kubeletDir=/var/lib/kubelet` on the Helm install (redundant).** Talos uses the upstream default `/var/lib/kubelet`, so the override is a no-op (it is only needed on k0s / microk8s / RKE2). **Fix:** Removed the flag and added a one-sentence note explaining why no override is needed on Talos.

5. **"Mount hangs on boot" troubleshooting (irrelevant).** With no OS-level mounts, there is no boot-time NFS dependency. The same failure mode does exist at pod scheduling time. **Fix:** Replaced with a "Pod stuck `ContainerCreating` waiting on NFS" entry that points to the same root causes.

6. **"Stale file handle" remediation suggesting `umount`/reboot (impractical on Talos).** Talos has no user shell, so a manual remount is not possible. **Fix:** Changed the remediation to deleting and recreating the pod so the kubelet re-establishes the mount.

7. **Summary paragraph repeated the false claim about system-level mounts.** **Fix:** Rewrote the summary to match the corrected scope.

## Review Notes
- The `machine.sysctls` section is syntactically valid; whether the listed `net.core.*` / `net.ipv4.tcp_*` keys are permitted depends on Talos's sysctl allowlist for the running version, but these particular keys are commonly accepted. No change made.
- The `helm repo add` URL uses the `master` branch of the chart raw content. This is the URL the upstream csi-driver-nfs README still documents, so it is left as-is; consumers should be aware the repo may move under a different branch in the future.
- `timeo=600` (60 seconds) is correctly explained as deciseconds, matching `nfs(5)`.
- The post claims "NFSv4 integrated with Kerberos" for "better security" — this requires explicitly configuring `sec=krb5` (and a KDC), which is out of scope for the post but worth knowing.
- The `nfs` inline volume type on PersistentVolume is a built-in (not deprecated) source as of current Kubernetes; the CSI driver is the recommended path for new workloads but the static PV approach still works.

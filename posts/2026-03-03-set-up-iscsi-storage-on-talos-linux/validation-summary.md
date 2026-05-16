# Validation Summary: How to Set Up iSCSI Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos Linux system extensions
- iSCSI and open-iscsi
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes CSI
- democratic-csi
- Helm

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux Boot Assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Sidero Labs extensions catalog: https://github.com/siderolabs/extensions
- Sidero Labs iscsi-tools extension source: https://github.com/siderolabs/extensions/tree/main/storage/iscsi-tools
- Talos for Linux Admins command reference: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-for-linux-admins
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes archived iSCSI CHAP example documentation: https://github.com/kubernetes/examples/tree/master/volumes/iscsi
- democratic-csi project documentation: https://github.com/democratic-csi/democratic-csi

## Issues Found
- The post described running `ghcr.io/siderolabs/iscsi-tools:latest` as a Kubernetes DaemonSet. The official Talos support path is the `iscsi-tools` system extension, which provides open-iscsi tooling and the `ext-iscsid` service. I replaced the DaemonSet with system-extension installation and verification commands.
- The Talos kernel module example included `iscsi_target_mod` and `libiscsi`. For initiator use, the relevant explicit module is `iscsi_tcp`; `iscsi_target_mod` is for running a target, not mounting iSCSI volumes from Kubernetes. I removed the incorrect target-side module from the initiator example.
- The static PV/PVC examples omitted `storageClassName: ""`. In clusters with a default StorageClass, a PVC without this field can be defaulted to that class and fail to bind to a manually created classless PV. I added `storageClassName: ""` to the static examples.
- The performance tuning section included `net.ipv4.tcp_nodelay`, which is not a Linux sysctl. TCP_NODELAY is a socket option. I removed that setting.
- The troubleshooting command used `talosctl get kernelmodules`, but current Talos documentation maps `lsmod`-style checks to `talosctl get loadedkernelmodules`. I updated the command.
- The multi-path section implied that listing multiple iSCSI portals was sufficient for all multipath setups. I clarified that device-mapper multipath setups also need the Talos `multipath-tools` system extension.

## Review Notes
The democratic-csi Helm flow and TrueNAS/FreeNAS-oriented values are broadly consistent with the democratic-csi documentation, but production deployments should still use the exact example values and driver variant recommended for the target TrueNAS version.

# Validation Summary: How to Troubleshoot Disk Space Issues on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes kubelet
- Kubernetes node-pressure eviction
- containerd / CRI logging
- etcd / etcdctl
- Kubernetes persistent volumes

## Sources Consulted
- Talos Linux disk layout documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux etcd maintenance documentation: https://docs.siderolabs.com/talos/v1.12/advanced/etcd-maintenance/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- etcd maintenance documentation: https://etcd.io/docs/v3.3/op-guide/maintenance/

## Issues Found
- The Talos disk layout omitted the META partition and stated that STATE is always encrypted. Updated the layout to include META and clarified that STATE encryption applies when disk encryption is enabled.
- The ephemeral partition check used a case-sensitive `grep ephemeral`, while Talos volume labels are commonly shown as `EPHEMERAL`. Changed it to `grep -i ephemeral`.
- The post said a `kubectl get node ...status.images` command manually triggers garbage collection and lists unused images. Corrected this to say it only inspects images reported in node status.
- The post attributed pod log placement directly to containerd. Updated it to reflect Kubernetes behavior: kubelet directs the CRI runtime to write logs under `/var/log/pods`.
- The etcd section recommended compacting and defragmenting with `etcdctl` as the normal path. Updated it to use `talosctl etcd defrag` for Talos and clarified that Kubernetes API server performs automatic etcd compaction, with manual `etcdctl compact` reserved for known safe revisions.
- The persistent volume section implied all local PV data is under `/var/lib/kubelet/pods`. Clarified that local PV or hostPath data is on the node disk, and only some pod volume data is visible under the kubelet pod directory.

## Review Notes
- Kubelet flags shown through `machine.kubelet.extraArgs` are still accepted but many kubelet command-line flags are marked deprecated upstream in favor of the kubelet configuration file. Talos still exposes `extraArgs` as a supported MachineConfig field.
- The sizing recommendations are practical guidance rather than strict upstream requirements; they were left unchanged.

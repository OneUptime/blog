# Validation Summary: How to Troubleshoot Service Failures on Talos Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubelet
- etcd
- containerd / CRI

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux v1.10 CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos Linux machine configuration editing guide: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos Linux etcd maintenance guide: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Talos Linux disaster recovery guide: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos Linux certificate management guide: https://www.talos.dev/v1.10/talos-guides/howto/cert-management/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- Replaced `talosctl services` with `talosctl service`, matching the current Talos CLI command for listing and controlling services.
- Replaced the claim that `talosctl health` triggers certificate renewal. Talos automatically manages server-side certificates, while kubelet certificate rotation requires a kubelet restart or node reboot.
- Corrected the machine configuration patch example from `--patch` to `-p`, matching Talos documentation for `talosctl patch machineconfig`.
- Corrected the etcd maintenance guidance for oversized databases: Talos documentation notes Kubernetes automatic compaction and recommends checking alarms and defragmenting one member at a time.
- Replaced `/proc/mounts` as a disk-space check with `talosctl usage`, which is the Talos CLI command for disk usage.
- Corrected the bootstrap-token wording so the command is described as inspection, not token generation.
- Replaced the invalid `talosctl etcd restore --snapshot` disaster recovery command with `talosctl bootstrap --recover-from=...`, matching the Talos disaster recovery procedure.

## Review Notes
The guide is generally version-agnostic. The corrected commands were checked against current and recent Talos documentation, but service names and operational details can still vary slightly by Talos and Kubernetes release.

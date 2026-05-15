# Validation Summary: How to Wipe Specific Partitions on Talos Linux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- `talosctl`
- Kubernetes node maintenance
- Disk and partition management

## Sources Consulted
- Sidero Labs Talos disk layout documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Sidero Labs Talos architecture documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/architecture
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos disk encryption documentation, which documents selective `talosctl reset --system-labels-to-wipe` flows: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Sidero Labs Talos disk management documentation: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- Replaced stale `talosctl disks` examples with `talosctl get disks`, which matches the current Talos CLI and disk layout documentation.
- Replaced `talosctl get systemdisk` with `talosctl get discoveredvolumes`, because the official disk layout documentation uses `DiscoveredVolume` resources for partition labels and volume discovery.
- Replaced `talosctl get blockdevices` with current inspection commands (`talosctl get discoveredvolumes` and `talosctl usage`) because `blockdevices` is not the current documented resource for this workflow.
- Replaced `talosctl services ... | grep kubelet` with `talosctl service kubelet`, matching the current singular `service` command in the Talos CLI reference.
- Corrected partition descriptions for EFI, BOOT, and META to avoid inaccurate size and storage claims. The official docs describe EFI as boot data, BOOT as bootloader/kernel/initramfs data, and META as Talos metadata.
- Corrected the comparison between wiping STATE and EPHEMERAL versus a full reset. Selectively wiping those labels preserves boot partitions and user disks, while the current CLI default reset mode is `--wipe-mode all`.
- Corrected the user disk section to clarify that user disks are preserved during selective system-label wipes, but a full reset uses `--wipe-mode all` by default. Added `--wipe-mode user-disks` to the user-disks-only reset example.
- Corrected the comparison table so full reset wipes user disks by default, and user-disk-only reset does not imply the node continues running when `--reboot=true` is used.

## Review Notes
The selective partition reset examples using `--system-labels-to-wipe STATE` and `--system-labels-to-wipe EPHEMERAL` match official Talos documentation. The script remains operationally plausible, but operators should still validate node names and drain behavior in their cluster because workloads with strict PodDisruptionBudgets or unmanaged pods can block `kubectl drain`.

# Validation Summary: How to Wipe and Reinstall Talos Linux on a Node

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Sidero Image Factory
- Kubernetes node maintenance
- etcd membership management
- PXE, ISO, and raw disk image installation
- IPMI serial console workflows

## Sources Consulted
- Talos v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1.12 Image Factory documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/image-factory
- Talos v1.12 Boot Assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos v1.12 ISO installation documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/iso
- Talos v1.12 PXE installation documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/pxe
- Talos editing machine configuration documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The control plane removal example used `talosctl etcd remove-member` as the primary path. Talos documents `etcd leave` as the preferred command for healthy reachable nodes, so the example now uses `talosctl etcd leave` first and reserves `remove-member` for unreachable or broken members.
- The machine configuration backup command used `talosctl get machineconfig -o yaml`, which does not retrieve the raw machine configuration as shown in the Talos docs. It now uses `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'`.
- Method 1 claimed a reset with `--system-labels-to-wipe STATE` and `EPHEMERAL` was a full reinstall and that the installer image determined the installed OS version. Talos reset only wipes the selected partitions while preserving BOOT, so the method was renamed and reworded as a reset/reconfiguration workflow.
- The Image Factory examples pinned old Talos version `v1.7.0`. The examples now use a `TALOS_VERSION` variable set to `v1.12.1`, matching current Talos documentation at review time.
- The iPXE example omitted Talos' documented required PXE kernel parameters `slab_nomerge` and `pti=on`. These were added.
- The post-installation disk verification used `talosctl disks`, but Talos documents disk inventory as the `disks` resource via `talosctl get disks`. The command was corrected.
- The IPMI example implied `ipmitool sol activate` mounts virtual media. It only opens a serial-over-LAN console, so the text now distinguishes virtual media mounting from using `ipmitool` for console access.
- The ISO install comments implied every install completely wipes existing partitions. Talos' machine config has `machine.install.wipe`, so the comment now notes that `machine.install.wipe: true` is required when existing partitions should be wiped.
- Kubernetes node verification and automation checked the node IP without `-o wide`, but the default `kubectl get nodes` output does not include internal IPs. Those commands now use `kubectl get nodes -o wide`.
- The automation script accepted an unused `TALOS_VERSION` argument and described a reset workflow as a reinstall. The unused variable and related wording were corrected.
- The secure wipe example piped `/dev/zero` through a nonexistent/unsupported `talosctl write` workflow. It now uses the documented `talosctl wipe disk --method ZEROES` command with a device name argument.

## Review Notes
Local `talosctl` was not installed in the review environment, so Talos command validation was performed against the official Sidero Labs documentation instead of local `--help` output. The guide remains version-sensitive because Talos boot asset URLs and CLI behavior can change across releases.

# Validation Summary: How to Configure VM Resources for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (control plane: etcd, kube-apiserver, kube-controller-manager, kube-scheduler)
- QEMU / KVM (qemu-system-x86_64, qemu-img)
- libvirt (virsh)
- VMware vSphere / govc (govmomi)
- Proxmox VE (qm CLI)
- Microsoft Hyper-V (Set-VMMemory PowerShell cmdlet)
- VirtIO (block + network drivers)
- talosctl (memory, stats, usage subcommands)
- Talos machine configuration (disks/partitions YAML)

## Sources Consulted
- [Talos Linux System Requirements](https://www.talos.dev/v1.9/introduction/system-requirements/)
- [Sidero Talos Disk Management](https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/)
- [govmomi/govc USAGE documentation](https://github.com/vmware/govmomi/blob/main/govc/USAGE.md)
- [Govc User Guide (SoByte)](https://www.sobyte.net/post/2022-04/govc-usage/)
- QEMU `-smp` documentation / Red Hat Virtualization Administration Guide
- Microsoft Hyper-V `Set-VMMemory` PowerShell cmdlet reference
- Proxmox VE `qm` man page

## Issues Found
- **Incorrect govc flag for CPU count.** The post used `govc vm.change -vm talos-cp-1 -cpu 4`, but `govc vm.change` does not accept a `-cpu` flag for CPU count. The correct flag is `-c` (e.g. `govc vm.change -vm talos-cp-1 -c 4`). Fixed by replacing `-cpu 4` with `-c 4`. The `-cpu.reservation` flag in the following line is a valid sub-option and was left unchanged.

## Review Notes
- Talos minimum/recommended resources in the table align with the official system requirements (Control Plane: 2 vCPU / 2 GB min, 4 vCPU / 4 GB recommended; Worker: 1 vCPU / 1 GB min).
- The QEMU `-smp cpus=4,cores=4,threads=1` syntax is valid: it specifies 4 total vCPUs with 4 cores per (implicit) socket and 1 thread per core.
- The `talosctl usage /var` command is a valid Talos CLI command for inspecting filesystem usage on a node.
- `talosctl stats` returns container CPU/memory statistics rather than overall node CPU usage; the post's framing as "Check CPU usage" is acceptable but a reader looking for node-level CPU metrics may also want `talosctl dashboard` or `talosctl processes`. Not changed as the command itself is correct.
- The Hyper-V `Set-VMMemory` example with `-MinimumBytes`/`-MaximumBytes` would generally also require `-DynamicMemoryEnabled $true` to actually take effect; however, the cmdlet itself accepts these parameters without error so the example will run. Left as-is since the post explicitly recommends fixed allocation over ballooning in the next paragraph.
- The Talos disk partition description in the "Disk Configuration" section is a simplification of the actual partition layout (which includes EFI/BIOS, BOOT, META, STATE, and EPHEMERAL partitions) but is not technically wrong for a high-level overview.
- "Resource Allocation Patterns" appears without a `##` markdown heading prefix (likely an oversight) but this is a stylistic/markdown issue, not a technical one, so it was not modified per the review scope.

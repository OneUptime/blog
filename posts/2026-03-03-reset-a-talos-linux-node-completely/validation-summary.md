# Validation Summary: How to Reset a Talos Linux Node Completely

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Talos Linux
- talosctl CLI (reset, etcd, apply-config, health, get, cluster)
- Kubernetes (kubectl drain/cordon/delete)
- etcd (cluster membership / quorum)
- Bash scripting
- nmap (network discovery)

## Sources Consulted
- Talos `talosctl` CLI reference: https://www.talos.dev/v1.9/reference/cli/
- Talos "Resetting a Machine" lifecycle docs: https://www.talos.dev/v1.8/talos-guides/resetting-a-machine/
- Talos architecture / disk layout: https://www.talos.dev/v1.9/learn-more/architecture/
- talosctl reset source: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/reset.go
- Talos maintenance-mode networking / apid (port 50000) documentation

## Issues Found
1. **`--reboot` default was misstated.** The post described `--reboot=true` as the default for `talosctl reset`. The actual default in the talosctl source is `false` (the node shuts down by default after the wipe). Updated the flag description to make clear the default is `false` and that `--reboot=true` must be passed explicitly. Existing example commands already pass `--reboot=true`, so they remained correct.
2. **`talosctl cluster show --nodes 10.0.0.0/24` is not a real command.** `talosctl cluster show` operates only on local docker/qemu clusters created by `talosctl cluster create`; it does not accept a CIDR and cannot scan a network for maintenance-mode Talos nodes. Replaced with an `nmap -p 50000 --open 10.0.0.0/24` scan, which targets the Talos apid port that is open in maintenance mode.
3. **BOOT partition description was inaccurate.** The post stated the BOOT partition "contains the Talos OS itself". In reality the Talos OS image is a read-only squashfs loaded into RAM; the BOOT partition holds the bootloader, kernel, and initramfs (with EFI/BIOS partitions also present). Rewrote that line to describe BOOT as containing the bootloader/kernel/initramfs and noted that EFI/BIOS partitions are also preserved.

## Review Notes
- `talosctl etcd remove-member <member-id>` is current and correct; older Talos versions accepted a hostname, but the modern syntax (Talos ≥ ~v1.4) takes the hex member ID as shown in the post.
- `--user-disks-to-wipe` and `--system-labels-to-wipe` flag names, repeatability, and accepted label values (STATE, EPHEMERAL) are correct.
- `talosctl apply-config --insecure --file ...`, `talosctl health --wait-timeout 10m`, and `talosctl get machinestatus --insecure` are all valid current invocations.
- Quorum guidance (never resetting all control plane nodes at once; resetting one at a time on a three-node control plane) is correct.
- Future maintenance: Talos also exposes a newer `--wipe-mode` flag (`all|system-disk|user-disks`) that could optionally be mentioned, but the post's approach using `--system-labels-to-wipe` and `--user-disks-to-wipe` remains supported and is not deprecated.

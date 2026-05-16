# Validation Summary: How to Install Talos Linux on Proxmox VE

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux v1.7.0
- Proxmox VE (qm CLI)
- talosctl
- Kubernetes / kubectl
- Cilium (CNI)
- Rancher local-path-provisioner v0.0.26
- Talos VIP (virtual IP) feature
- Talos nocloud image format

## Sources Consulted
- Talos v1.7.0 GitHub release (asset filenames): https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Sidero Labs Talos Proxmox install guide: https://www.talos.dev/v1.7/talos-guides/install/virtualized-platforms/proxmox/
- Proxmox `qm` man page: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox forum on ejecting CD-ROM media: https://forum.proxmox.com/threads/inserting-a-cdrom-iso.34746/
- Talos VIP networking docs: https://docs.siderolabs.com/talos/v1.7/networking/vip/
- talosctl CLI reference (v1.7): https://docs.siderolabs.com/talos/v1.7/reference/cli
- Cilium CLI repository (flag semantics): https://github.com/cilium/cilium-cli
- Rancher local-path-provisioner v0.0.26: https://github.com/rancher/local-path-provisioner/releases/tag/v0.0.26

## Issues Found
1. **Wrong Talos ISO asset filename.** The post referenced `talos-amd64.iso` in both the `wget` URL and every `qm create ... --ide2 local:iso/talos-amd64.iso,media=cdrom` invocation. That file does not exist in the Talos v1.7.0 GitHub release — the generic/metal ISO is published as `metal-amd64.iso`. Renamed across all five occurrences so the download and VM-create commands actually work.

2. **Invalid `qm set --ide2 none` syntax.** The post used `qm set ${vmid} --ide2 none` to detach the ISO. Per the Proxmox `qm` documentation, `--ideN` expects a volume specifier; the canonical way to eject CD-ROM media while leaving the drive in place is `--ide2 none,media=cdrom` (alternatively `--delete ide2` to remove the drive entirely). Changed to `--ide2 none,media=cdrom`, which matches the original `--ide2 ...,media=cdrom` shape used at VM creation.

3. **Deprecated `cilium install --helm-set` flag.** The post used `cilium install --helm-set ipam.mode=kubernetes`. Current cilium-cli uses `--set` for Helm-style key=value overrides on `cilium install`. Changed to `--set ipam.mode=kubernetes`.

## Review Notes
- `talosctl machineconfig patch <file> --patch @file.yaml --output out.yaml` is a valid v1.7 invocation; the post correctly uses this newer subcommand instead of regenerating configs with `--config-patch`.
- `talosctl apply-config --insecure --nodes <ip> --file <yaml>` is the correct flow for nodes in maintenance mode (initial config push over the insecure Talos API on TCP/50000).
- The Talos VIP YAML (`machine.network.interfaces[].vip.ip` with `dhcp: true` on the same interface) matches the official Talos v1.7 example. The post says "apply this to all control plane nodes" without showing the actual command — users would typically use `talosctl patch mc --nodes <ip> --patch @vip-patch.yaml` or regenerate via `--config-patch-control-plane`. Left as-is since the YAML itself is correct.
- The install disk `/dev/sda` is correct for the `--scsihw virtio-scsi-pci` controller chosen in the `qm create` commands. If a reader switched to virtio-blk, the path would change to `/dev/vda`.
- The `nocloud-amd64.raw.xz` filename and `xz -d` extraction step are accurate for the Talos v1.7.0 release.
- `qm importdisk` is deprecated in Proxmox 8.x in favor of `qm disk import`, but the old form still works as an alias — not corrected.
- Talos v1.7.0 is several minor releases behind current (v1.10+ as of mid-2026). The installer image `ghcr.io/siderolabs/installer:v1.7.0` pin matches the ISO/nocloud pins so the post is internally consistent; left as-is to preserve the author's stated version.
- The tip "Disable the QEMU guest agent since Talos does not support it" is defensible — the agent is not present in stock Talos; running it requires the optional `qemu-guest-agent` system extension. Left as-is.
- `talosctl health --wait-timeout` is a valid flag in v1.7.

# Validation Summary: How to Install Talos Linux on QEMU/KVM

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.7.0)
- QEMU / KVM
- libvirt / virsh / virt-install
- talosctl
- kubectl / Kubernetes
- qcow2 disk format, qemu-img
- Bash scripting

## Sources Consulted
- Talos Linux v1.7.0 release assets: https://github.com/siderolabs/talos/releases/tag/v1.7.0 (verified via `gh release view`)
- Talos Linux v1.7 documentation: https://www.talos.dev/v1.7/
- Talos CLI reference (cluster create, machineconfig patch, apply-config, bootstrap, health, kubeconfig, config): https://www.talos.dev/v1.7/reference/cli/
- Talos local QEMU provisioner docs: https://www.talos.dev/v1.7/talos-guides/install/local-platforms/qemu/
- Talos VIP networking docs: https://www.talos.dev/v1.7/talos-guides/network/vip/
- Talos installer image registry: ghcr.io/siderolabs/installer
- libvirt virsh network XML schema (forward mode='nat', dhcp host static mappings)
- virt-install(1) man page for `--os-variant`, `--network network=...,model=virtio,mac=...`, `--disk path=...,bus=virtio`, `--cpu host`, `--boot hd`, `--import`, `--noautoconsole`
- qemu-img(1) for backing files (`-b`/`-F`) and preallocation modes

## Issues Found
1. **Missing `--provisioner qemu` flag on `talosctl cluster create`**: The Quick Start section invoked `talosctl cluster create` with no provisioner flag. Talos `talosctl cluster create` defaults to `--provisioner docker` (confirmed in the v1.7 CLI reference). Without `--provisioner qemu`, the command would silently create Docker containers rather than QEMU VMs, which contradicts the entire section's premise. Added `--provisioner qemu` (and `sudo -E` since the QEMU provisioner needs root to create tap/bridge interfaces) to both the `talosctl cluster create` and the matching `talosctl cluster destroy` commands. Added an inline comment so readers understand why the flag is required.

## Review Notes
- All `talosctl cluster create` flags used (`--controlplanes`, `--workers`, `--cpus`, `--memory`, `--disk`) are valid in v1.7.
- The `talosctl machineconfig patch ... --patch @file.yaml --output ...` syntax is correct for v1.7.
- The `nocloud-amd64.raw.xz` asset exists in the v1.7.0 GitHub release; using it as a qcow2 backing image is a valid approach since the nocloud image is a pre-installed bootable disk.
- The VIP patch YAML structure (under `machine.network.interfaces[].vip.ip`) matches the Talos v1.7 schema. VIP only activates after Kubernetes bootstrap; the post's flow (bootstrap on .11 first, then point endpoint at the VIP) accommodates this implicitly.
- The libvirt network XML (`<forward mode='nat'/>`, `<bridge ... stp='on' delay='0'/>`, `<dhcp>` with `<host mac='...' ip='...'/>` static reservations) is valid for libvirt's NAT network mode.
- `virt-install` flags `--os-variant generic`, `--network network=talos,model=virtio,mac=...`, `--disk path=...,bus=virtio`, `--import`, `--noautoconsole`, `--cpu host`, `--boot hd` are all valid.
- The raw QEMU `-netdev bridge,id=net0,br=virbr-talos` invocation requires `qemu-bridge-helper` to be permitted in `/etc/qemu/bridge.conf` (i.e., an `allow virbr-talos` line) — worth noting but not a syntax error.
- `kvm-ok` comes from the `cpu-checker` package on Debian/Ubuntu and is not installed by default; the post offers `ls -la /dev/kvm` as an alternative which works without extra packages.
- `qemu-img create -f qcow2 -o preallocation=metadata` is a valid preallocation mode (alongside off/falloc/full).
- Talos v1.7.0 is an older release (current stable is significantly newer at the time of this review). Readers may want to substitute a current version, but the URLs, installer image tags, and config schema described are correct for v1.7.0.
- The two consecutive `talosctl gen config` invocations in the "Generating Talos Configuration" section are presented as alternatives (single endpoint vs. VIP), but running both back-to-back would overwrite the first output. The intent is clear from the comment, so left as-is.

# Validation Summary: How to Install Talos Linux on VirtualBox

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Oracle VirtualBox / VBoxManage CLI
- talosctl
- kubectl / Kubernetes
- Bash scripting
- Host-only networking and DHCP (VirtualBox)

## Sources Consulted
- Talos Linux v1.7.0 release assets: https://github.com/siderolabs/talos/releases/tag/v1.7.0 (verified via `gh release view`)
- Talos Linux documentation: https://www.talos.dev/v1.7/
- `talosctl machineconfig patch` reference: https://www.talos.dev/v1.7/reference/cli/#talosctl-machineconfig-patch
- `talosctl apply-config` / `bootstrap` / `health` / `kubeconfig` references in Talos CLI docs
- VirtualBox VBoxManage documentation: https://www.virtualbox.org/manual/ch08.html (modifyvm, createvm, storagectl, storageattach, hostonlyif, dhcpserver)
- Talos installer image registry: ghcr.io/siderolabs/installer

## Issues Found
1. **Incorrect ISO filename**: The post referenced `talos-amd64.iso` in the download URL and several subsequent commands. The correct asset filename in the Talos v1.7.0 release (confirmed via `gh release view v1.7.0 --repo siderolabs/talos`) is `metal-amd64.iso`. Fixed all three occurrences (download URL, `mv` command, and the VBoxManage `--medium` attachment path) to use `metal-amd64.iso`.

## Review Notes
- The `VBoxManage modifyvm` flags used (`--memory`, `--cpus`, `--boot1..4`, `--firmware efi`, `--rtcuseutc on`, `--graphicscontroller vmsvga`, `--vram 16`, `--audio-driver none`, `--nic1 hostonly`, `--nictype1 virtio`, `--hostonlyadapter1`) are all valid for VirtualBox 7.x.
- The `talosctl machineconfig patch` syntax with `--patch @file.yaml --output ...` is correct for v1.7.
- The installer image path `ghcr.io/siderolabs/installer:v1.7.0` matches the official Sidero Labs registry.
- The `/dev/sda` install disk is correct for the SATA-attached disk created in the script.
- Host-only adapter setup with `VBoxManage hostonlyif create` and `vboxnet0` works on Linux as written. On macOS with VirtualBox 7.0+, the host-only adapter model has additional restrictions (and `hostonlynet` is recommended), but this is a portability caveat rather than a technical error in the script.
- The IP discovery section relies on `arp -a` / `nmap` because Talos does not ship the VirtualBox Guest Additions; this is accurate.
- Talos v1.7.0 is an older release (current stable is significantly newer at the time of this review). Readers may want to substitute a current version, but the URLs, image tags, and config schema described are correct for v1.7.0 as written.

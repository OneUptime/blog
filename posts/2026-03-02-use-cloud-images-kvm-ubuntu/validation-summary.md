# Validation Summary: How to Use Cloud Images with KVM on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu cloud images (Jammy 22.04, Noble 24.04)
- KVM / QEMU
- libvirt (`virsh`, `virt-install`)
- cloud-init (NoCloud datasource)
- `cloud-localds` (from `cloud-image-utils`)
- `qemu-img` (qcow2 backing files / overlays)
- Netplan v2 network configuration
- Bash scripting

## Sources Consulted
- cloud-init official docs (Final Message module variables): https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init source `cc_final_message.py` on GitHub (canonical/cloud-init) — confirmed that `subs.update(dict([(k.upper(), v) for k, v in subs.items()]))` provides both lowercase and uppercase substitution keys (`uptime`, `timestamp`, `version`, `datasource` and their uppercase forms)
- `cloud-localds` source (canonical/cloud-utils, `bin/cloud-localds`) — confirmed `-N`/`--network-config` is a valid option (Ubuntu manpages are outdated and do not list it)
- Ubuntu cloud images URL structure: https://cloud-images.ubuntu.com/ (jammy/current, noble/current)
- `virsh` / `virt-install` / `qemu-img` CLI conventions (verified flags like `--os-variant ubuntu22.04`, `--import`, `--graphics none`, `--noautoconsole`, `qemu-img create -F qcow2`, `virsh change-media --eject --force`, `virsh detach-disk --persistent`)

## Issues Found

1. **`meta-data` heredoc used `<< 'EOF'` (single-quoted), preventing `$(date +%s)` expansion.**
   The single-quoted delimiter disables shell substitution, so the `instance-id` would have ended up as the literal string `webserver-01-$(date +%s)` rather than a timestamp, contrary to the clear intent. Changed to unquoted `<< EOF` so the command substitution runs and produces a real timestamp-based instance-id.

2. **`$HOSTNAME` in `final_message` is not a supported cloud-init substitution variable.**
   Per the cloud-init docs and `cc_final_message.py`, the only supported placeholders are `version`, `timestamp`, `datasource`, `uptime` (and their uppercase variants added via `subs.update(...)`). `$HOSTNAME` would either be left as a literal or cause a render error. Replaced `Hostname: $HOSTNAME` with `Datasource: $DATASOURCE`, which is a documented and supported variable.

## Review Notes
- `cloud-localds`'s `--network-config` flag is genuinely supported in current `cloud-image-utils` builds (Launchpad/GitHub source). The official Ubuntu Jammy/Noble manpages are stale and omit it, which can be confusing when readers verify against `man cloud-localds`. The post's usage is correct.
- `qemu-img create -b ... -F qcow2` correctly specifies the backing-file format, which has been mandatory since QEMU 3.1 to avoid the security warning. Good.
- The post uses `--os-variant ubuntu22.04` even in the section that mentions downloading the Noble 24.04 image. If a reader builds a VM from the Noble image they should use `--os-variant ubuntu24.04`. Not strictly wrong (the script's `BASE_IMAGE` points at Jammy), but worth noting.
- The interface name `enp1s0` assumes the default libvirt machine type / virtio NIC bus topology. On some hypervisor configurations the predictable name may differ (e.g. `ens3`). Not a defect, but readers should verify with `ip link` if cloud-init network config doesn't apply.
- The reusable script's `sleep 15` before `virsh domifaddr` is often too short for first-boot DHCP — a longer wait or polling loop would be more reliable, but this is a UX nit rather than a technical error.

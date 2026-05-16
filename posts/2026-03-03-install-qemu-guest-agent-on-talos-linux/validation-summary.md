# Validation Summary: How to Install QEMU Guest Agent on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (system extensions, machine configuration, talosctl)
- QEMU Guest Agent (QGA)
- Proxmox VE (qm CLI, web UI, agent command set)
- libvirt / virt-install (virtio guest agent channel)
- Talos Image Factory (schematic API)
- Talos Imager tool (Docker-based ISO builder)
- Terraform (Telmate Proxmox provider syntax)

## Sources Consulted
- Proxmox VE qm manual: https://pve.proxmox.com/pve-docs/qm.1.html (verified `qm agent` subcommand list)
- Sidero Labs extensions catalog: https://github.com/siderolabs/extensions (verified `ghcr.io/siderolabs/qemu-guest-agent` OCI path and versioning convention)
- Talos Image Factory API: https://factory.talos.dev (schematic POST endpoint and image URL pattern)
- libvirt domain XML reference for virtio guest agent channel name `org.qemu.guest_agent.0`

## Issues Found
1. **Incorrect command in "Time Synchronization" section.** The post showed `qm agent <vmid> set-user-password` with a comment claiming it syncs the guest clock. This is wrong on two counts: (a) `set-user-password` would set a user password, not the time, and (b) `set-user-password` is not even one of Proxmox's `qm agent` subcommands per the official `qm.1` manual — it's exposed separately as `qm guest passwd`. Proxmox's `qm agent` CLI does not expose a `set-time` command at all; the QEMU guest agent handles post-resume time sync automatically. Replaced the example with `qm agent <vmid> get-time` (a real subcommand) and updated the surrounding prose to note the sync happens automatically.

## Review Notes
- The QEMU Guest Agent extension version pinned in the post (`v8.2.0`) is valid but old — current upstream is `v11.0.0`. The post explicitly tells readers to "check the extensions repository for the current version," so leaving the example tag as-is is acceptable. Same caveat applies to the `iscsi-tools:v0.1.4` and `installer:v1.7.0` / `imager:v1.7.0` tags used as illustrative examples.
- The "Clean Shutdown" section says "Without the guest agent, only forced stop works." This is slightly overstated — `qm shutdown` falls back to an ACPI power button event when the agent is absent, and Talos honors ACPI shutdown. The agent-driven path is more reliable, but the absolute phrasing is imprecise. Left unchanged because it is a stylistic nuance rather than a technical error.
- The Terraform snippet uses the legacy Telmate `proxmox_vm_qemu` resource shape (standalone `disk {}` / `network {}` blocks). This is correct for Telmate v2.x but readers on the newer bpg/proxmox provider would need different syntax. Not changed since the post doesn't claim provider-version compatibility.
- `talosctl get extensions` is valid; some Talos versions also expose `talosctl get extensionservices` for the running service state. The post's usage is fine.

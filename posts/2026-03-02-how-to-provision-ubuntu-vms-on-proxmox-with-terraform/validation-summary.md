# Validation Summary: How to Provision Ubuntu VMs on Proxmox with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox VE (7.x / 8.x)
- Terraform (1.5+)
- bpg/proxmox Terraform provider
- Ubuntu 22.04 (Jammy) cloud image
- cloud-init
- QEMU/KVM (`qm` CLI)
- `pveum` CLI for user/role/token management
- `virt-customize` (libguestfs-tools)

## Sources Consulted
- bpg/terraform-provider-proxmox release history: https://github.com/bpg/terraform-provider-proxmox/releases
- Proxmox User Management wiki: https://pve.proxmox.com/wiki/User_Management
- Proxmox `pveum` manual: https://pve.proxmox.com/pve-docs/pveum.1.html
- Proxmox `qm` manual: https://pve.proxmox.com/pve-docs/qm.1.html
- bpg/proxmox Terraform Registry docs: https://registry.terraform.io/providers/bpg/proxmox/latest/docs
- Ubuntu cloud images: https://cloud-images.ubuntu.com/jammy/current/
- libguestfs `virt-customize` documentation: https://libguestfs.org/virt-customize.1.html

## Issues Found

1. **Outdated provider version constraint.** The post specified `version = "~> 0.46"` for the bpg/proxmox provider. v0.46.x was released in early 2024; at the time the post was written (March 2026) the current line was v0.98.x. Updated to `~> 0.98` to reflect a version that was current and stable when the post was published.

2. **Invalid Proxmox privilege `VM.Monitor`.** This privilege no longer appears in current Proxmox VE documentation; the audit-style guest interaction capability is now provided by the `VM.GuestAgent.*` set (specifically `VM.GuestAgent.Audit`). Replaced `VM.Monitor` with `VM.GuestAgent.Audit` in the `pveum role add` command. Also added `VM.Audit`, which is required for the provider to read VM state — its omission was an oversight that would have caused permission errors during plan/refresh operations.

3. **Deprecated boot-config syntax.** `qm set 9000 --boot c --bootdisk scsi0` is the legacy boot syntax that has been superseded by the unified `--boot order=...` form. While the legacy form still works as a compatibility shim, the modern form is documented and matches what newer Proxmox versions emit. Updated to `qm set 9000 --boot order=scsi0`.

## Review Notes

- `qm importdisk` is now an alias for `qm disk import` in Proxmox VE 8. The original command still functions correctly, so it was left as-is to stay readable for users on either version.
- `virt-customize --run-command "systemctl enable qemu-guest-agent"` is valid: `systemctl enable` falls back to creating wants-symlinks without a running dbus/systemd, which is exactly what virt-customize needs.
- The single-VM `web_server` resource sets both `initialization.user_account` (cloud-init via Proxmox) and a `users:` block in the cloud-init snippet. Both create/manage the `ubuntu` user. This is not an error — the cloud-init merge semantics handle it — but it is a slight duplication worth being aware of when extending the example.
- The `memory { dedicated = 4096; floating = 4096 }` combination enables the balloon device but effectively pins memory at the dedicated value (since min equals max). The comment "Enable ballooning" is accurate about the device being enabled, even though no actual ballooning will occur with these values.
- The bpg/proxmox provider continues to evolve quickly; schema attributes used here (`disk.ssd`, `disk.iothread`, `network_device.model`, `agent.enabled`, etc.) were verified against the v0.98+ schema but may shift in future major versions — readers pinning to a newer line should re-check the registry docs.

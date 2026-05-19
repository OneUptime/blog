# Validation Summary: How to Manage KVM VMs with Proxmox on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox VE (`qm` CLI, `pvesh`, `vzdump`, `qmrestore`)
- KVM / QEMU virtualization
- QEMU Guest Agent
- Ubuntu (as guest OS)
- Bash scripting

## Sources Consulted
- Proxmox `qm` man page: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox `qmrestore` man page: https://pve.proxmox.com/pve-docs/qmrestore.1.html
- Proxmox `vzdump` man page: https://pve.proxmox.com/pve-docs/vzdump.1.html
- Proxmox Wiki Manual: qm.conf — https://pve.proxmox.com/wiki/Manual:_qm.conf
- Proxmox Wiki: Serial Terminal — https://pve.proxmox.com/wiki/Serial_Terminal
- Proxmox Wiki: QEMU Guest Agent — https://pve.proxmox.com/wiki/Qemu-guest-agent

## Issues Found

1. **Boot order command had unquoted semicolon** — The example `qm set 201 --boot order=ide2;scsi0` would be broken by bash, since `;` is a command separator. The shell would attempt to run `qm set 201 --boot order=ide2` and then `scsi0` as a separate command. Fixed by quoting the value: `qm set 201 --boot 'order=ide2;scsi0'`.

2. **`qm suspend` description was inaccurate** — The post described `qm suspend 201` as "Suspend to disk (saves state and stops the VM)", but per the Proxmox docs, `qm suspend` defaults to `--todisk 0`, meaning it pauses the VM with state kept in RAM (the VM remains in memory, just paused). Suspend-to-disk requires explicitly passing `--todisk 1`. Updated the comment to reflect the actual default behavior and mention the `--todisk 1` option.

3. **`qm agent exec` used invalid `--command` JSON syntax** — The post showed `qm agent 201 exec --command '{"execute":"guest-exec",...}'`, but there is no `--command` flag and the QMP-style JSON payload is not accepted by the CLI. The correct invocation is `qm guest exec <vmid> [--] <command> [args...]` (e.g. `qm guest exec 201 -- df -h`). Replaced the example accordingly.

## Review Notes

- `qm agent` is a long-standing alias for `qm guest cmd` (used for simple agent commands like `network-get-interfaces`, `get-vcpus`, `get-memory-blocks`). These usages in the post are valid. However, the official canonical form is `qm guest`, and authors may want to migrate examples to that form in future revisions.
- `qm rollback` in current Proxmox VE will stop a running VM automatically when needed, so the strict "VM must be stopped" guidance is more conservative than required, but it remains safe and acceptable advice.
- The `awk '{print $2}' | grep -v '^$' | xargs ... qm delsnapshot` one-liner will attempt to delete the synthetic `current` entry from `qm listsnapshot` output; that one deletion will fail harmlessly, but a stricter filter (e.g. `grep -v 'current'`) would be cleaner.
- The unused `BASE_ID=300` variable in the deployment script is harmless but dead code; left as-is to avoid stylistic changes.
- The example `qmrestore` path `/var/lib/vz/dump/...` corresponds to the `local` storage default, while the preceding `vzdump` example used `--storage local-backup`. Users will need to substitute the actual path for their configured backup storage. This is illustrative and does not constitute a technical error.

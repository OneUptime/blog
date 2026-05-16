# Validation Summary: How to Reset a Talos Linux Node to Factory Defaults

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI (reset, etcd leave, apply-config)
- Kubernetes (kubectl cordon / drain)
- etcd

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos lifecycle / resetting a machine guide: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- talosctl reset source: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/reset.go

## Issues Found
1. **Incorrect default for `--reboot`.** The post claimed "The `--reboot` option is the default." In reality, the `--reboot` flag defaults to `false` in `talosctl reset`; the node powers off after a reset unless `--reboot` is explicitly passed. Updated the "Resetting with Reboot" section to clarify that shutdown is the default and `--reboot` is opt-in.
2. **Non-existent `--shutdown` flag.** The post showed `talosctl reset --nodes <node-ip> --shutdown`. There is no `--shutdown` flag — passing it would error out. Replaced the example with the correct command (just omit `--reboot`, since shutdown is the default) and rewrote the surrounding sentence accordingly.
3. **Graceful reset step list implied a guaranteed reboot.** Step 6 read "Reboots into maintenance mode," which is only true when `--reboot` is passed. Updated to "Shuts the node down (or reboots into maintenance mode if `--reboot` is passed)" so the list matches the actual default behavior.
4. **"What Happens After Reset" assumed a reboot.** The sentence "After the reset completes and the node reboots, it enters maintenance mode" only applies when `--reboot` is passed. Reworded to cover both the reboot and shutdown paths.
5. **Misleading comment on `--system-labels-to-wipe`.** The inline comment said "specify which system disk to target," but the flag selects partition labels to wipe, not a disk. Updated the comment to reflect what the flag actually does.

## Review Notes
- Verified `talosctl etcd leave` exists as a real subcommand (distinct from `etcd remove-member`, which targets unreachable members).
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the current (non-deprecated) flag — `--delete-local-data` was removed in favor of `--delete-emptydir-data`.
- The post correctly notes that `--graceful=true` is the default; explicitly passing it is fine for didactic clarity.
- The default `--wipe-mode` is `all` (wipes the full system disk while preserving the OS installation). The post's framing ("wipes the STATE and EPHEMERAL partitions") is a reasonable user-facing simplification — META is also affected in practice — but is acceptable as written.
- The `talosctl apply-config --insecure` flow for maintenance mode is accurate.

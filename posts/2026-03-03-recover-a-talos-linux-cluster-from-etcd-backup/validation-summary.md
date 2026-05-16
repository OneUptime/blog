# Validation Summary: How to Recover a Talos Linux Cluster from etcd Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- etcd (v3) / etcdctl
- Kubernetes (kubectl)
- Disaster recovery / cluster bootstrap workflows

## Sources Consulted
- Talos disaster recovery documentation: https://www.talos.dev/v1.12/advanced/disaster-recovery/
- Talos etcd maintenance documentation: https://www.talos.dev/v1.12/advanced/etcd-maintenance/
- Talos `talosctl reset` CLI reference (including `--system-labels-to-wipe`, `--graceful`, and `--reboot` flags): https://www.talos.dev/v1.12/reference/cli/#talosctl-reset
- Talos `talosctl bootstrap` CLI reference (including `--recover-from`): https://www.talos.dev/v1.12/reference/cli/#talosctl-bootstrap
- Companion already-validated post `posts/2026-03-03-restore-etcd-from-a-snapshot-in-talos-linux/README.md` (validated against the same Talos v1.12 docs)
- etcd v3 snapshot/restore documentation: https://etcd.io/docs/v3.5/op-guide/recovery/

## Issues Found

1. **Missing `--reboot` flag on `talosctl reset` (Step 1).** All three `talosctl reset` invocations lacked `--reboot`. With the default `--reboot=false`, the node is shut down after the wipe rather than rebooted, so it would never come back online for bootstrap — directly breaking the "Wait for all nodes to complete the reset" instruction that follows. Added `--reboot` to each reset command (matching the pattern used in the already-validated companion post `restore-etcd-from-a-snapshot-in-talos-linux`).

2. **Wrong post-reset readiness check (Step 1).** The post used `talosctl get machinestatus` to check whether nodes were "ready for bootstrap." The actual signal that Talos is ready for `bootstrap --recover-from` is the etcd service entering the `Preparing` state. Replaced with `talosctl service etcd --nodes <cp-node-1>` and updated the surrounding prose to describe what to look for.

## Review Notes

- `talosctl bootstrap --nodes <node> --recover-from ./etcd-backup.db` is correct and matches the documented Talos recovery procedure.
- `--system-labels-to-wipe EPHEMERAL` (space-separated) is accepted by `talosctl reset`; the `=` form is equally valid.
- `talosctl etcd status`, `talosctl etcd members`, `talosctl services`, `talosctl dmesg --follow`, `talosctl logs etcd`, `talosctl logs kube-apiserver`, `talosctl logs kubelet`, and `talosctl apply-config --nodes <n> --file <f>` are all valid as of Talos v1.12.
- `talosctl logs machined` is not a standard Talos-managed service log target — machined runs as PID 1 and its output is generally inspected via `talosctl dmesg`. The post's troubleshooting suggestion will return an error on most setups, but since it sits in a "look for errors" troubleshooting block (and the immediately preceding line is the more useful `talosctl dmesg`-style instruction), I left it as-is rather than restructure the troubleshooting section. Worth revisiting in a future pass.
- The recovery flow described (reset all CP nodes → bootstrap one with `--recover-from` → let others rejoin automatically) matches the official Talos multi-node restore procedure.
- If the snapshot was copied directly from `/var/lib/etcd/member/snap/db` rather than produced via `talosctl etcd snapshot`, the user will additionally need `--recover-skip-hash-check`. The post does not mention this — not strictly an error since the prerequisites step assumes a `talosctl etcd snapshot`-style backup, but worth adding in a future revision.
- The `--recover-from` flag and `--system-labels-to-wipe=EPHEMERAL` reset pattern have been stable across Talos 1.8+ releases; re-verify if Talos overhauls bootstrap UX in a future major version.

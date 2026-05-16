# Validation Summary: How to Restore a Talos Linux Cluster After Catastrophic Failure

## Status
validated

## Post Type
Tutorial / Disaster recovery runbook

## Technologies Covered
- Talos Linux (talosctl CLI)
- Kubernetes (kubectl)
- etcd (snapshot / restore)
- Bare metal, VM, and cloud provisioning of Talos nodes

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos disaster recovery guide: https://www.talos.dev/latest/advanced/disaster-recovery/
- Talos "insecure flag" doc: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/insecure
- siderolabs/talos issue #9013 (FR: Allow `talosctl dmesg` with `--insecure`, closed as not planned): https://github.com/siderolabs/talos/issues/9013
- siderolabs/talos issue #9521 (Avoid using `--insecure` during bootstrap)
- `talosctl bootstrap --recover-from`, `talosctl etcd snapshot|status|members`, `talosctl health --wait-timeout`, `talosctl apply-config --insecure`, `talosctl get machineconfig -o yaml`, `talosctl kubeconfig`, `talosctl services` all confirmed in the v1.12/v1.13 CLI reference.

## Issues Found
1. **`talosctl dmesg --insecure` is not a valid flag** (Step 2, "Wait for the nodes to install and reboot"). The `--insecure` flag exists only on a narrow set of commands (`apply-config`, `version`, `get`, `meta`, `reset`, `wipe disk`); a feature request to add it to `dmesg` was closed as not planned (siderolabs/talos#9013). Running `talosctl dmesg --follow --insecure` against a node in maintenance mode will fail.

   **Fix:** Removed `--insecure` from the `talosctl dmesg` invocation and updated the surrounding comment to note that this command should be run once the node has rebooted into Talos and TLS trust is established; before that, monitor the physical/virtual machine console for install progress.

## Review Notes
- The `talosctl bootstrap --recover-from <snapshot>` syntax for restoring etcd from a snapshot during bootstrap matches the official disaster recovery documentation.
- All other commands (`talosctl etcd status|members|snapshot`, `talosctl health --wait-timeout`, `talosctl services`, `talosctl kubeconfig`, `talosctl get machineconfig -o yaml`, `talosctl apply-config --insecure`) are correct.
- The general flow (apply config → bootstrap with `--recover-from` → join remaining CP nodes → workers → cleanup → revalidate → fresh backup) matches the recommended Talos disaster recovery procedure.
- For very large snapshots, users may also want `--recover-skip-hash-check` if the snapshot was copied directly from the etcd data directory rather than produced by `etcdctl snapshot save` / `talosctl etcd snapshot`; not required for snapshots produced by `talosctl etcd snapshot`, so no change made.
- `kubectl run ... --image=busybox` examples in Step 9 are fine, though on hardened clusters with Pod Security Admission enforcing `restricted`, these one-shot pods may be rejected; this is environment-specific and not strictly a technical error.

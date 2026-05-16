# Validation Summary: How to Prepare Control Plane Nodes for Recovery in Talos

## Status
validated

## Post Type
Tutorial / Disaster recovery guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes control plane recovery
- Bash scripting
- IPMI / BMC remote management

## Sources Consulted
- Talos Linux talosctl CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos Linux resetting a machine guide: https://www.talos.dev/v1.9/talos-guides/resetting-a-machine/
- Talos Linux disaster recovery documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- Talos Linux disk layout reference: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout/
- Talos Linux system services: https://www.talos.dev/v1.9/learn-more/components/
- Prior validated peer posts in this collection (notably `use-talosctl-bootstrap-recover-from-for-disaster-recovery`, `wipe-ephemeral-partition-to-reset-etcd-in-talos`, `recover-a-talos-linux-cluster-from-etcd-backup`)

## Issues Found
- Multiple service inspection commands used `talosctl services`, but the documented CLI command is `talosctl service` (singular). Updated all occurrences in the assessment, post-reset verification, readiness check, bootstrap preparation, and pre-recovery checklist sections.
- The `talosctl reset` examples did not include `--reboot` even though the surrounding prose said the node would "come back" or "reboot and start services fresh." Current Talos CLI documentation states that reset shuts the node down unless `--reboot` is set, so `--reboot` was added to all reset examples that expect the node to come back online (single-node reset, all-control-plane loop, and manual etcd recovery single-node reset). The explanatory comment for `--graceful=false` was extended to also mention `--reboot`.
- `talosctl get machineconfig` was used without a resource ID. Talos documentation queries the machine config as `talosctl get machineconfig v1alpha1`, so the resource ID was added in the verification section and pre-recovery checklist.
- The bootstrap preparation section said etcd should be in the "Waiting" state before bootstrap, but Talos documents the pre-bootstrap state as "Preparing" (etcd waiting for the bootstrap signal). Updated the comment and switched the inspection command to `talosctl service etcd` so the state is actually visible.
- The pre-recovery checklist parsed `talosctl services` output by column to extract the etcd state. Updated it to query `talosctl service etcd` directly and parse the `STATE` line, matching the actual single-service output format.

## Review Notes
- `talosctl reboot --mode powercycle` is valid (documented mode for forcing a hardware power cycle through the BMC/hypervisor where supported).
- `talosctl get disks` and `talosctl get machinestatus` are valid resource queries documented in the Talos CLI reference.
- `talosctl apply-config --insecure` is the correct command for nodes in maintenance mode where TLS trust has not yet been established.
- `talosctl bootstrap --recover-from` is the correct way to invoke recovery from an etcd snapshot; this post correctly describes it as needing a clean etcd state on the bootstrap node.
- `talosctl` was not installed in the review environment, so CLI verification was performed against official Talos/Sidero Labs documentation and consistent usage in other validated posts in this collection rather than local `--help` output.

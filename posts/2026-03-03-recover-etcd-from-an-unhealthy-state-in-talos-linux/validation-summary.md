# Validation Summary: How to Recover etcd from an Unhealthy State in Talos Linux

## Status
validated

## Post Type
Troubleshooting / recovery guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes control plane
- Prometheus alerting

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/v1.12/reference/cli/
- Talos Linux etcd maintenance guide: https://www.talos.dev/v1.12/advanced/etcd-maintenance/
- Talos Linux disaster recovery guide: https://www.talos.dev/v1.12/advanced/disaster-recovery/
- Talos Linux machine configuration reference (cluster.etcd.extraArgs): https://www.talos.dev/v1.12/reference/configuration/v1alpha1/config/
- etcd tuning documentation (heartbeat / election timeout defaults): https://etcd.io/docs/v3.5/tuning/
- etcd metrics reference (etcd_server_has_leader, etcd_server_leader_changes_seen_total): https://etcd.io/docs/v3.5/metrics/
- etcd storage / quota documentation (quota-backend-bytes): https://etcd.io/docs/v3.5/dev-guide/limit/

## Issues Found
- The "Member Has Corrupted Data" fix invoked `talosctl reset --system-labels-to-wipe EPHEMERAL --graceful=false` without `--reboot`. In Talos 1.x, `--reboot` does not default to true, so the node would be wiped but not reboot back into the cluster. Added `--reboot` to match the documented disaster-recovery procedure and the pattern used in other Talos recovery posts in this repo.

## Review Notes
- `talosctl etcd status`, `talosctl etcd members`, `talosctl etcd remove-member`, `talosctl etcd snapshot`, `talosctl service etcd restart`, and `talosctl services` are all valid talosctl subcommands as documented in the Talos CLI reference.
- The `cluster.etcd.extraArgs` machine-config snippets (`quota-backend-bytes`, `heartbeat-interval`, `election-timeout`) match the documented Talos config schema, and the cited etcd defaults (100ms heartbeat, 1000ms election timeout) are correct.
- The Prometheus alert `count(etcd_server_has_leader) < 3` is a reasonable simplification — it fires when a member stops exporting metrics — but in production you may prefer `max without (instance) (etcd_server_has_leader) == 0` to catch a member that is up but has lost its leader. Left as-is since it matches the post's narrative.
- The split-brain section understates how rare true split-brain is in etcd (raft requires a quorum to accept writes, so a minority partition stops accepting writes). This is a narrative choice rather than a technical inaccuracy and was left unchanged.

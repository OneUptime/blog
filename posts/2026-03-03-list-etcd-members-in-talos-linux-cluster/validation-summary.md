# Validation Summary: How to List etcd Members in a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- etcd (cluster membership, learner members, member IDs)
- Kubernetes control plane
- Bash scripting

## Sources Consulted
- Talos Linux CLI reference (`talosctl etcd members`, `etcd remove-member`, `etcd leave`, `apply-config`, `health`, `services`, `logs`): https://www.talos.dev/v1.8/reference/cli/
- Talos Linux etcd maintenance docs: https://www.talos.dev/v1.8/advanced/etcd-maintenance/
- etcd learner documentation: https://etcd.io/docs/v3.5/learning/design-learner/
- etcd member API reference (member IDs are 64-bit hex): https://etcd.io/docs/v3.5/

## Issues Found

1. **Incorrect `talosctl etcd members` output format.** The post showed output as a single `MEMBERS` column listing members inline as `IP (id: ...)`. The actual command emits a table with columns `NODE | ID | HOSTNAME | PEER URLS | CLIENT URLS | LEARNER`. Replaced the example output with the real column layout and updated the bullet list of fields to match (added hostname, peer URLs, client URLs, learner flag).

2. **Wrong flag for `talosctl health`.** The post used `talosctl health --nodes <cp-ip>`, but `talosctl health` does not honor the generic `--nodes` selector for cluster health checks. It requires `--control-plane-nodes` and `--worker-nodes` to identify the cluster topology. Updated the example to use the correct flags with a comma-separated list of node IPs.

## Review Notes

- The statement that learners are "promoted to full voting members automatically" is accurate in the Talos context — core etcd does not auto-promote learners, but Talos implements its own controller that promotes a learner once it has caught up. Left unchanged since the post is scoped to Talos.
- `talosctl etcd leave` and `talosctl etcd remove-member <id>` syntax verified correct, including the operational distinction (run `leave` on the departing node; run `remove-member` from a healthy node when the target is offline).
- `talosctl apply-config --insecure --nodes <ip> --file controlplane.yaml` is correct; `--file` / `-f` is the documented flag.
- `talosctl services` and `talosctl logs etcd` are valid as written.
- Member IDs are confirmed to be hexadecimal, persist across restarts, and change on remove-and-readd, matching the post's claims.
- Output column widths in the corrected table are illustrative; the actual `talosctl` output is whitespace-aligned and may vary slightly.

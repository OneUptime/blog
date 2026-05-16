# Validation Summary: How to Replace a Failed Node in a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes (kubectl)
- etcd
- StatefulSets and Persistent Volumes

## Sources Consulted
- Sidero Labs talosctl CLI reference (v1.9): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos Linux guides (replace node guide): https://www.talos.dev/latest/talos-guides/howto/replace-node/
- Sidero Labs `talosctl config endpoint` documentation
- Sidero Labs `talosctl apply-config` documentation
- Sidero Labs `talosctl etcd remove-member` documentation
- Sidero Labs `talosctl gen config` documentation
- Sidero Labs `talosctl get` resource documentation

## Issues Found
1. **Incorrect subcommand `talosctl config endpoints` (plural).** The correct subcommand is `talosctl config endpoint` (singular), even when supplying multiple endpoint IPs. The plural form `endpoints` only appears as a field name inside the talosconfig file itself, not as a CLI subcommand. Fixed in Step 6 of the control plane replacement section.

## Review Notes
- `talosctl etcd remove-member <member-id>` correctly takes a member ID (a numeric value returned by `talosctl etcd members`), not a hostname or IP — the post is accurate on this point.
- `talosctl apply-config --insecure --nodes <ip> --file worker.yaml` uses valid long-form flags (`-i`/`--insecure`, `-f`/`--file`). Correct for applying config to a node in maintenance mode.
- `talosctl get machineconfig -o yaml` is valid; `machineconfig` (alias `mc`) is a recognized resource type that returns the current machine configuration.
- `talosctl gen config <cluster-name> <endpoint> --with-secrets secrets.yaml` is valid; `--with-secrets` accepts a secrets bundle previously generated via `talosctl gen secrets`.
- The control plane replacement procedure (etcd remove-member → kubectl delete node → apply-config to new machine) matches the recommended workflow in the official Talos guides.
- The reminder that the new control plane node joins an existing etcd cluster automatically (no `talosctl bootstrap` required) is correct — bootstrap is only for the very first control plane node of a brand-new cluster.
- The caveat about local persistent volumes being node-bound is accurate Kubernetes behavior.

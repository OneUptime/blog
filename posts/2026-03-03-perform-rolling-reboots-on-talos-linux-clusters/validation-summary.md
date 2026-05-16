# Validation Summary: How to Perform Rolling Reboots on Talos Linux Clusters

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- Kubernetes (`kubectl`)
- etcd
- Pod Disruption Budgets (PDBs)
- Bash scripting

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/v1.12/reference/cli/
- Talos `talosctl reboot` documentation
- Talos `talosctl etcd` subcommand documentation (`status`, `members`)
- Talos `talosctl health` documentation
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- **`talosctl health -n <cp-node-ip> --wait-timeout 10m`** (control plane reboot section): The global `-n/--nodes` flag only sets the API target endpoint; it does not declare cluster topology to the health check. `talosctl health` semantically expects `--control-plane-nodes` (and/or `--worker-nodes`) to know which nodes to validate. Changed to `talosctl health --control-plane-nodes <cp-node-ip> --wait-timeout 10m` so the post's intent (wait for the rejoined control plane node) actually works correctly.

## Review Notes
- All other `talosctl` commands verified correct: `talosctl reboot -n`, `talosctl etcd status -n`, `talosctl etcd members -n` (this is the actual command name — plural, not `member list`).
- `kubectl drain` flags are all current; `--delete-emptydir-data` is the correct modern flag name (replaced the deprecated `--delete-local-data`).
- `kubectl wait --for=condition=Ready node/<name>` syntax is correct.
- `PodDisruptionBudget` uses `apiVersion: policy/v1`, which has been GA since Kubernetes 1.21 (`policy/v1beta1` was removed in 1.25) — current and correct.
- The Bash script is syntactically sound and follows good practice (`set -euo pipefail`, explicit cordon+drain, post-reboot etcd verification).
- Minor observation (not a technical error): the `get_node_name` function uses `kubectl get nodes -o wide | grep "$ip"` which is fragile if any node name or label coincidentally contains the IP string. A more robust approach would be JSONPath-based selection on the `InternalIP` address field, but this is a future polish item rather than a correctness issue.

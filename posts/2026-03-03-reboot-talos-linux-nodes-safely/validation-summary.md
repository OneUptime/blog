# Validation Summary: How to Reboot Talos Linux Nodes Safely

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- Kubernetes (`kubectl` CLI)
- etcd (member health checks)
- Pod Disruption Budgets (PDBs, `policy/v1` API)
- Bash scripting for automation

## Sources Consulted
- Talos Linux official CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos `talosctl reboot` documentation: https://www.talos.dev/latest/reference/cli/#talosctl-reboot
- Talos `talosctl health` documentation: https://www.talos.dev/latest/reference/cli/#talosctl-health
- Talos `talosctl etcd` subcommand documentation: https://www.talos.dev/latest/reference/cli/#talosctl-etcd
- Kubernetes documentation on safely draining nodes: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Kubernetes Pod Disruption Budget concepts: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- PodDisruptionBudget `policy/v1` API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/

## Issues Found
No technical issues found.

All commands, flags, and API references were verified against current Talos Linux and Kubernetes documentation:

- `talosctl reboot --nodes <node-ip>` — correct syntax.
- `talosctl etcd members --nodes <ip>` — correct subcommand for listing etcd members.
- `talosctl health --nodes <ip> --wait-timeout 5m` — correct flag and duration format.
- `talosctl version`, `talosctl dmesg`, `talosctl services` — all valid commands accepting `--nodes`.
- `kubectl cordon`, `kubectl drain`, `kubectl uncordon` — standard, correct usage.
- `kubectl drain` flags `--ignore-daemonsets`, `--delete-emptydir-data`, `--timeout=300s` — all valid and current (the older `--delete-local-data` is correctly avoided in favor of `--delete-emptydir-data`).
- PodDisruptionBudget example using `apiVersion: policy/v1` — correct; `policy/v1` is the stable API since Kubernetes 1.21.
- Description of PDB semantics with `minAvailable: 2` — accurate.

## Review Notes
- The `kubectl get deployments --all-namespaces | grep -v "1/1\|2/2\|3/3"` snippet is a useful shorthand but will not catch deployments with replica counts other than 1/1, 2/2, or 3/3 (e.g., 4/4, 5/5). It functions as illustrative guidance rather than a complete health check; the author's intent is clearly demonstrative so no change is warranted.
- The bash scripts that derive `NODE_NAME` from `kubectl get nodes -o wide | grep $node | awk '{print $1}'` rely on the IP appearing only in the expected column and on a unique match. This is a common pattern and acceptable for an example, but readers running the scripts at scale may want to use `kubectl get node -o jsonpath` for a more robust lookup.
- No version pinning is given for Talos Linux or Kubernetes; the commands shown are compatible with current releases of both projects as of the validation date.

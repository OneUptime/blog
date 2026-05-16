# Validation Summary: How to Drain Nodes Before Maintenance in Talos Linux

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Talos Linux
- Kubernetes (kubectl drain, cordon, uncordon)
- talosctl (upgrade, apply-config, reset)
- PodDisruptionBudgets (PDBs)
- DaemonSets, StatefulSets, Deployments
- jq (used for filtering PDB JSON output)

## Sources Consulted
- Kubernetes documentation: Safely Drain a Node (https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- kubectl reference: drain, cordon, uncordon (https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain)
- Kubernetes PodDisruptionBudget API reference — `status.disruptionsAllowed` field
- Talos Linux documentation: talosctl upgrade, apply-config, reset (https://www.talos.dev/v1.7/reference/cli/)
- Sidero Labs container registry — installer image at `ghcr.io/siderolabs/installer`

## Issues Found
No technical issues found.

All commands and flags verified:
- `kubectl drain` flags `--ignore-daemonsets`, `--delete-emptydir-data`, `--force`, `--timeout`, `--grace-period` are all current and correctly described. (`--delete-emptydir-data` is the modern replacement for the deprecated `--delete-local-data`.)
- `kubectl cordon` / `uncordon` behavior and the resulting `SchedulingDisabled` STATUS column are accurate.
- The PDB JSON path `.status.disruptionsAllowed` is the correct field.
- The `kubectl delete pod ... --grace-period=0 --force` syntax for force-removing stuck pods is correct.
- `talosctl upgrade`, `apply-config`, and `reset` invocations use valid `--nodes`, `--image`, and `--file` flags. The image reference `ghcr.io/siderolabs/installer:v1.7.0` is a real Talos release tag in the correct registry path.
- The high-level description of drain semantics (cordon → evict respecting PDBs → graceful termination → DaemonSets skipped) matches Kubernetes documented behavior.

## Review Notes
- The statement that DaemonSet pods "cannot be rescheduled" is a slight simplification — they are skipped because the DaemonSet controller would immediately recreate them on the same node. The practical takeaway in the post is still correct.
- `grep Terminating` on `kubectl get pods` output is fine as a quick filter but could match pods whose names contain "Terminating". A `--field-selector status.phase=...` filter is not available for this state (Terminating is reflected in `metadata.deletionTimestamp`, not phase), so the grep approach is reasonable for a tutorial.
- The Talos installer image version `v1.7.0` is pinned in the upgrade example; readers running newer clusters should substitute the appropriate current Talos version. Not an error — just a normal version caveat.
- No backslash-line-continuation issues; multi-line `kubectl drain` invocations are syntactically valid bash.

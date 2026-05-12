# Validation Summary: Runbook: Calico Pod CIDR Conflicts

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (projectcalico.org/v3)
- calicoctl
- Kubernetes / kubectl
- IPAM and CIDR networking concepts

## Sources Consulted
- kubectl rollout restart docs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- kubernetes/kubectl issue #1751 (open request to add `--all` / `--all-namespaces` to rollout restart): https://github.com/kubernetes/kubectl/issues/1751
- calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl patch / delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- **`kubectl rollout restart deployment --all --all-namespaces` / `kubectl rollout restart daemonset --all --all-namespaces` were invalid.** `kubectl rollout restart` does not accept `--all-namespaces` (or `-A`) — this is an open feature request (kubectl#1751) that has not been merged in any release through 1.31. Running the original command fails with `unknown flag: --all-namespaces`. Replaced the two commands with a loop that enumerates deployments and daemonsets across all namespaces via `kubectl get deploy,ds -A -o jsonpath=...` and calls `kubectl -n "$ns" rollout restart` per resource. Added a short inline comment explaining why the loop is necessary.

## Review Notes
- The calicoctl commands (`ipam check`, `ipam show --show-blocks`, `patch ippool ... --patch='{"spec":{"disabled":true}}'`, `delete ippool`) are all valid against current Calico (v3.27+) documentation.
- The IPPool YAML uses valid spec fields: `cidr`, `ipipMode: Always`, `natOutgoing: true`. All three are documented and accepted values.
- The example `cidr: 192.168.0.0/16` for the replacement pool happens to be Calico's default install CIDR; in a real migration the operator must pick a CIDR that does not overlap with the original conflicting range — the surrounding text already makes this clear, so no change needed.
- `kubectl get nodes -o wide | awk '{print $6}'` correctly targets the `INTERNAL-IP` column (column 6 of the standard wide output).
- Step 3 ("Identify the overlap") contains an empty code block with a comment referencing "the monitoring script from the Monitor post" — this is a soft cross-reference and not technically incorrect, but a future revision could either inline a small comparison snippet or remove the empty block.
- The mermaid diagram accurately reflects the documented procedure.

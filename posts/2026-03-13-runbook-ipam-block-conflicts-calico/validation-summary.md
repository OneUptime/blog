# Validation Summary: Runbook: IPAM Block Conflicts in Calico

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (CNI)
- calicoctl CLI
- Kubernetes (kubectl)
- IPAM (IP Address Management)
- BlockAffinity custom resource
- calico-kube-controllers

## Sources Consulted
- Calico documentation: `calicoctl ipam check` — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: `calicoctl ipam release` — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico BlockAffinity resource reference — https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico operations guide on managing block affinities and orphaned blocks
- kubectl reference for `get pods -o wide` output columns (NAMESPACE, NAME, READY, STATUS, RESTARTS, AGE, IP, NODE, NOMINATED NODE, READINESS GATES)
- `kubectl rollout restart` reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout

## Issues Found
No technical issues found.

All commands and resources reference real, current Calico and Kubernetes APIs:
- `calicoctl ipam check` is the documented IPAM consistency checker.
- `calicoctl get blockaffinity` / `calicoctl delete blockaffinity` correctly target the BlockAffinity resource type.
- The `.spec.node` jsonpath matches the BlockAffinity schema (which also has `cidr`, `state`, `deleted` fields under spec).
- The YAML grep approach (`grep "node:" | awk '{print $2}'`) correctly extracts the node name from `spec.node:` lines.
- `kubectl get pods -o wide` column 7 is correctly the pod IP.
- `calico-kube-controllers` deployment lives in the `kube-system` namespace in standard Calico installations and is the controller responsible for IPAM garbage collection of orphaned block affinities.
- The `sleep 60` after restarting calico-kube-controllers is a reasonable wait for the controller to reconcile state before re-running `calicoctl ipam check`.

## Review Notes
- The deletion of BlockAffinity objects directly (`calicoctl delete blockaffinity`) is a valid approach for orphaned affinities. An alternative documented path is `calicoctl ipam release --affinity=<cidr>`, which releases the affinity by CIDR; either is acceptable, and the chosen approach is fine for orphaned-node cleanup.
- The shell pipelines that depend on `kubectl get pods -o wide` column positions (`awk '{print $7}'`) are inherently fragile if kubectl output format ever changes, but this is the standard approach in operational runbooks and is correct for current kubectl versions.
- The `grep -v "IP\|<none>"` pattern filters both the header row (containing "IP") and pods without assigned IPs (containing "<none>"), which is correct.
- Worth noting for readers: restarting `calico-kube-controllers` triggers its IPAM GC reconciliation loop; the controller is what would otherwise garbage-collect orphaned affinities on its periodic sync. The manual cleanup here accelerates resolution rather than waiting for the next sync cycle.
- No version-specific caveats — commands are stable across recent Calico releases (3.x).

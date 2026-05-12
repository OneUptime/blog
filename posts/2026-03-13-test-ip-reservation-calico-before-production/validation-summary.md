# Validation Summary: Test IP Reservation in Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+) - CNI and IPAM
- Calico IPReservation resource (projectcalico.org/v3)
- calicoctl CLI
- Kubernetes (kubectl deployments, drain, cordon/uncordon)
- nginx (1.25 container image used in tests)
- Bash scripting for validation checks

## Sources Consulted
- Calico IPReservation reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/ip-address-assignment
- kubectl drain reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Calico v3.20 release notes (IPReservation introduction)

## Issues Found
No technical issues found.

Verified items:
- `apiVersion: projectcalico.org/v3` and `kind: IPReservation` match the official resource definition.
- `spec.reservedCIDRs` is the correct field name and accepts CIDR or single-IP entries.
- IPReservation was introduced in Calico v3.20 — the "v3.20+" prerequisite is correct.
- `192.168.0.200/29` is a properly aligned /29 (200 is a multiple of 8) covering .200–.207 — matches the 8 reserved IPs enumerated in the test script.
- `calicoctl ipam show --show-blocks` and `calicoctl ipam check` are valid commands and flags.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the current flag (renamed from `--delete-local-data` in kubectl v1.20+).
- `kubectl create deployment ... --replicas=N -n NAMESPACE` is valid syntax.
- The bash `RESERVED_IPS` array correctly lists the 3 individual /32 IPs plus the 8 addresses covered by the /29.

## Review Notes
- The Step 3 drain procedure does not actually trigger a node restart by itself; the procedural intent (terminate/replace in cloud, or restart the underlying machine) is correctly noted in the inline comment. Readers should understand they need to perform the actual restart step in their environment.
- `calicoctl ipam show | grep "Leaked\|leaked"` relies on GNU grep BRE alternation (`\|`), which works on most Linux distributions; on platforms using BSD grep this would need `-E` and `|`.
- The `grep "^${ip}$"` check in Step 2 is correctly anchored, preventing false positives where `192.168.0.1` would otherwise match `192.168.0.10`, `192.168.0.100`, etc.
- Deploying 200 replicas as a stress test may not be feasible on small clusters or clusters with restrictive default pod-per-node limits — adjust based on cluster capacity.
- Worth noting (but not incorrect): retroactively adding an IPReservation does not free or migrate IPs already allocated to existing pods — the post correctly calls this out in Best Practices.

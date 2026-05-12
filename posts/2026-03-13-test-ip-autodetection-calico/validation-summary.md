# Validation Summary: How to Test IP Autodetection in Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- calicoctl CLI
- kubectl CLI
- Calico IPAM / IP Pools

## Sources Consulted
- Calico official documentation - IP Pools resource (https://docs.tigera.io/calico/latest/reference/resources/ippool)
- Calico calicoctl reference - ipam command (https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/)
- Calico calicoctl reference - get command (https://docs.tigera.io/calico/latest/reference/calicoctl/get)
- Kubernetes kubectl documentation - get pods output columns (https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get)

## Issues Found
- **Incorrect awk column in verify step**: The command `kubectl get pods -A -o wide | awk '{print $8}' | sort -u` was extracting column 8 (NODE) when the context (verifying IP pool changes) calls for the pod IP. In `kubectl get pods -A -o wide` output, columns are 1=NAMESPACE, 2=NAME, 3=READY, 4=STATUS, 5=RESTARTS, 6=AGE, 7=IP, 8=NODE. Changed `$8` to `$7` so the command actually prints unique pod IPs, which is what's needed to verify allocations from the configured pool.

## Review Notes
- The post is titled "Test IP Autodetection" but the body focuses on IP Pool / IPAM configuration rather than Calico's IP autodetection feature (e.g., `IP_AUTODETECTION_METHOD`, `nodeAddressAutodetectionV4`). This is a scope/title mismatch but is a structural/editorial concern outside the technical-correctness fix scope; the commands and config shown are themselves technically valid.
- The IPPool spec is valid for `projectcalico.org/v3`: `cidr`, `blockSize: 26` (the IPv4 default), `ipipMode: Never`, `vxlanMode: Never`, and `natOutgoing: true` are all correct field names and values.
- `calicoctl ipam show --show-blocks` and `calicoctl ipam check` are valid subcommands available in supported calicoctl versions (≥ v3.20).
- Calico v3.20 (released Aug 2021) is quite old as of 2026; while the commands shown still work in current releases, users on newer Calico versions installed via the Tigera operator may prefer the `Installation` CR over directly applying IPPool manifests.
- The conclusion sentence has an awkward duplication ("...in Calico Before Production in Calico requires...") — left as-is since it is a stylistic, not technical, issue.

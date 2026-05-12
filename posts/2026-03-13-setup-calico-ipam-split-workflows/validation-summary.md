# Validation Summary: Setting Up Calico IPAM Split Workflows

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Calico (v3.x) — Kubernetes CNI plugin
- `calicoctl` CLI (v3.x)
- `kubectl` CLI
- Kubernetes IPAM (IP Address Management)
- IPPool custom resource (`projectcalico.org/v3`)
- CIDR planning and node label selectors

## Sources Consulted
- Calico project documentation — IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico project documentation — calicoctl ipam commands: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Calico project documentation — calicoctl patch command: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico project documentation — Node selector syntax: https://docs.tigera.io/calico/latest/reference/resources/ippool#selector
- Calico project documentation — Migrate from one IP pool to another: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- kubectl command reference (`kubectl run`, `kubectl label`)

## Issues Found
No technical issues found.

Verified items:
- `calicoctl get ippool -o wide`, `calicoctl ipam show --show-blocks`, `calicoctl ipam check` — all valid v3.x commands with correct flags.
- IPPool YAML schema is correct: `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and spec fields `cidr`, `nodeSelector`, `ipipMode`, `vxlanMode`, `blockSize`, `natOutgoing`, `disabled` all match the official resource definition.
- Encapsulation mode values (`Never`, `Always`) are valid for both `ipipMode` and `vxlanMode`.
- Selector syntax `"zone == 'zone-a'"` matches the Calico selector grammar.
- CIDR arithmetic for the /16 → two /17 split is mathematically correct (10.0.0.0/17 covers 10.0.0.0–10.0.127.255, 10.0.128.0/17 covers 10.0.128.0–10.0.255.255).
- `calicoctl patch ippool` with JSON `--patch` payload is a valid invocation.
- `blockSize: 26` yields 64 IP addresses per block; the "62 usable" caveat is a reasonable approximation given Calico's reserved-address conventions per block.
- Step ordering (create sub-pools → label nodes → disable original) matches Calico's recommended migration procedure to avoid allocation gaps.
- `kubectl run --overrides='{...}'` and `kubectl label node ... key=value` are valid syntaxes.

## Review Notes
- `kubectl run --overrides` is deprecated in newer kubectl releases. It still works as of the current Kubernetes versions but a future-proof approach would be to write a small Pod manifest and apply it with `kubectl apply -f`. This is a minor stylistic note, not an error.
- The "62 usable" figure for a /26 block is conventional shorthand; Calico does not strictly reserve network/broadcast addresses the way classic L2 networks do, but it does reserve a handful of addresses per block for handles/tunnel IPs. The post's framing is acceptable.
- The post correctly notes that existing pod IPs in the disabled original pool remain valid and routable — this matches Calico's behavior (disabling only blocks new allocations).
- Worth noting (not flagged as an issue): some clusters use the well-known `topology.kubernetes.io/zone` label set automatically by the cloud provider. Using a custom `zone=` label requires manual labeling as the post shows, which is fine, but readers using managed Kubernetes may prefer to point the selector at the standard topology label instead.

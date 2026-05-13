# Validation Summary: How to Operationalize Calico IPAM Checks

## Status
validated

## Post Type
Operational Guide / Runbook

## Technologies Covered
- Calico (CNI / IPAM)
- Kubernetes
- `calicoctl` CLI
- Bash shell scripting
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico documentation: `calicoctl ipam check` — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: `calicoctl ipam show` — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: `calicoctl ipam release` — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico IPPool resource reference — https://docs.tigera.io/calico/latest/reference/resources/ippool
- Standard IPv4 subnet math (RFC 4632 — CIDR)

## Issues Found
No technical issues found.

- `calicoctl ipam check`, `calicoctl ipam show`, and `calicoctl ipam release --ip=<ip>` are correct command forms.
- The `IPPool` YAML uses the correct `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and valid `spec` fields (`cidr`, `ipipMode: Always`, `natOutgoing: true`).
- Subnet sizing math is accurate: /18 yields 2^14 − 2 = 16,382 usable IPs; /16 yields 2^16 − 2 = 65,534 usable IPs.
- The bash heredoc is correctly unquoted (`<< YAML`) so `${POOL_NAME}` and `${NEW_CIDR}` are expanded before being piped to `calicoctl apply`.
- The Mermaid flowchart syntax is valid.

## Review Notes
- `ipipMode: Always` is fine for the example, but operators on newer Calico installs frequently prefer `vxlanMode` or `ipipMode: CrossSubnet` depending on underlay. The post's choice is valid and intentional for a generic example.
- The generated `POOL_NAME` (e.g., `pool-10-250-0-0-16`) complies with DNS-1123 naming for Kubernetes resources.
- The capacity-planning runway formula assumes linear weekly growth; in practice cluster growth is often bursty, but the formula is appropriate as a conservative planning heuristic.

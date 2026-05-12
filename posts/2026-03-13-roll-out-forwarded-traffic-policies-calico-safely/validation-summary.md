# Validation Summary: How to Roll Out Forwarded Traffic Policies for Calico Hosts Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes
- Calico HostEndpoint resource
- Calico GlobalNetworkPolicy resource
- calicoctl CLI
- kubectl CLI
- Felix (Calico data plane component)
- iptables

## Sources Consulted
- Calico HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico data path / iptables architecture: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico install (hardway) — calico-node liveness probe: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Apply policy to forwarded traffic on hosts: https://docs.tigera.io/calico-cloud/network-policy/hosts/host-forwarded-traffic

## Issues Found
- **Incorrect iptables chain prefix in grep filter.** The Operational Commands section used `sudo iptables -L -n | grep CALICO`, but Felix-created iptables chains are prefixed with lowercase `cali-` (e.g., `cali-INPUT`, `cali-FORWARD`, `cali-fw-*`). The uppercase `CALICO` pattern would match no rules in a default Calico install. Changed to `sudo iptables -L -n | grep cali-` so the command returns the expected output.

## Review Notes
- The HostEndpoint spec fields (`interfaceName`, `node`, `expectedIPs`) and GlobalNetworkPolicy fields (`order`, `selector`, `applyOnForward`, `preDNAT`, `ingress`, `egress`, `types`) are all valid in `projectcalico.org/v3`.
- `applyOnForward: true` is correctly used here — it is required for policies that apply to forwarded traffic on host endpoints. (Also mandatory whenever `preDNAT: true` or `doNotTrack: true`.)
- Rule field syntax is correct: `source.nets` is the plural list form (singular `net` is not a valid field), and integer port lists like `[22, 443, 6443]` are valid (port ranges and named ports would need to be strings).
- The `calico-node -felix-live` liveness flag uses a single dash, which is correct per Calico's documented exec liveness probe (often combined as `calico-node -felix-live -bird-live`).
- The `selector: node == 'node01'` correctly references the `node` label declared on the HostEndpoint metadata.
- No version-specific deprecations apply for Calico v3.26+; all resources and fields used remain current.

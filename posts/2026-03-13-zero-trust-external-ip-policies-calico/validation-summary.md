# Validation Summary: Zero Trust with External IP Policies in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `NetworkPolicy`
- Calico `GlobalNetworkPolicy`
- External IP and CIDR policy matching
- `kubectl`

## Sources Consulted
- Calico documentation: Use external IPs or networks rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Apply Calico policy to services exposed externally as cluster IPs - https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips

## Issues Found
- The introduction described "External IP Policies" as if it were a distinct Calico policy type. Calico documents external IP control as IP/CIDR matching in `NetworkPolicy` and `GlobalNetworkPolicy`, typically through `nets` or network sets. Updated the wording to "external IP rules" and "external IP and CIDR matching."
- The default deny example used a cluster-wide `GlobalNetworkPolicy` with `selector: all()` and no exclusions. Calico warns that global default deny policies can affect workloads in all namespaces, including control plane and Calico namespaces, and recommends scoping global default deny carefully. Changed the example to a namespace-scoped Calico `NetworkPolicy` for `production`.
- The "External IP" policy example did not match external IPs. It used `source.selector: trust == 'verified'`, which matches selected Calico endpoints or network sets, not raw external CIDRs. Replaced it with documented `source.nets` and `destination.nets` examples.
- The egress example allowed UDP port 53 to any destination, which was a DNS allowance rather than an external IP zero trust rule. Replaced it with a TCP 443 egress allowance to a specific external CIDR.

## Review Notes
The verification command is syntactically valid, but it remains an illustrative smoke test because the post does not create the referenced pods, labels, service, or real external IP targets. A future improvement would be to include a complete runnable lab with a test workload and replace the documentation CIDRs with environment-specific addresses.

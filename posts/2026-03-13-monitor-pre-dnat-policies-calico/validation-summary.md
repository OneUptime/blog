# Validation Summary: How to Monitor Calico Pre-DNAT Policy Impact on Host Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (NodePort and LoadBalancer services)
- GlobalNetworkPolicy (pre-DNAT policies)
- calicoctl CLI
- Host Endpoints
- Mermaid (diagram syntax)

## Sources Consulted
- Calico documentation on GlobalNetworkPolicy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Pre-DNAT and apply-on-forward policy reference: https://docs.tigera.io/calico/latest/network-policy/policy-for-hosts/pre-dnat
- Calico Host Endpoints documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- calicoctl CLI reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Mermaid flowchart syntax (line breaks in node labels): https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- **Mermaid diagram literal newline**: The architecture diagram contained a literal newline character within a node label (`A[External Traffic\nto NodeIP:30000]`). This is not valid Mermaid syntax for unquoted node labels and can cause rendering failures. Fixed by replacing the newline with a `<br>` tag, which is the standard Mermaid syntax for line breaks inside node labels.

## Review Notes
- The post correctly states that `preDNAT: true` requires `applyOnForward: true` — this is enforced by Calico's validation.
- The post correctly limits the policy to `Ingress` types only, which is the constraint for pre-DNAT policies (egress rules are not supported in pre-DNAT mode).
- Host endpoints are correctly listed as a prerequisite, since pre-DNAT policies only apply to traffic on host endpoints (not workload endpoints).
- The selector example (`node == 'production-node'`) uses correct Calico selector syntax.
- The policy logic (Allow from specific CIDRs, then Deny all on the same ports) is correct and reflects intended source-IP allowlisting.
- Version reference "Calico v3.26+" is reasonable; the preDNAT feature has been available since earlier v3.x versions, so this requirement is comfortably met.
- The Introduction has a minor grammatical awkwardness ("This guide covers monitor pre-DNAT policies"), but per review instructions, only technical issues were corrected.

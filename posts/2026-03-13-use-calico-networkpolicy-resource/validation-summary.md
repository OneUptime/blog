# Validation Summary: Use Calico NetworkPolicy Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes namespaces and labels
- Kubernetes network policy enforcement
- DNS egress policy
- AWS IP ranges for egress allowlists

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico network policy concepts and default-deny behavior: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- AWS IP address ranges documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- AWS current IP ranges JSON: https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The ingress-controller source selector in the frontend example did not include a namespace selector. In a Calico namespaced NetworkPolicy, a rule selector without `namespaceSelector` is scoped to the policy namespace, so it would only match ingress-controller pods in `production`. Added `namespaceSelector: "kubernetes.io/metadata.name == 'ingress-nginx'"`.
- Several examples matched destination ports but did not specify `protocol: TCP`, even though the described traffic is HTTP, backend, database, or Prometheus scraping traffic. Added `protocol: TCP` to those allow rules so the examples reflect the intended TCP-only paths.
- The external egress example labeled `52.94.76.0/22` as an AWS API Gateway CIDR, but AWS's current `ip-ranges.json` lists that prefix under the `AMAZON` service, not `API_GATEWAY`. Replaced it with a current `API_GATEWAY` example prefix and noted that AWS ranges should be verified against `ip-ranges.json`.

## Review Notes
The Calico examples use the current `projectcalico.org/v3` API and valid NetworkPolicy fields. Kubernetes `kubernetes.io/metadata.name` namespace labels are usable in Calico namespace selectors, although Calico also documents `projectcalico.org/name` as its own automatic namespace-name label. YAML snippets were parse-checked locally with PyYAML.

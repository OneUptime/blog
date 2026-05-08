# Validation Summary: Understanding the L7 HTTP Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF
- Envoy
- HTTP L7 network policy
- kubectl

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/latest/security/network/proxy/envoy.html
- Cilium Helm values reference for `l7Proxy`: https://docs.cilium.io/en/stable/helm-values/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Official Cilium example policy: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/minikube/sw_l3_l4_l7_policy.yaml

## Issues Found
- The introduction said the exhaust-port scenario was a failure that "no traditional firewall can prevent." This was too broad because L7-aware firewalls or proxies can enforce HTTP method/path rules. Changed it to say L3/L4 filtering alone cannot prevent it.
- The blocked `curl` test comment said "same connection," but the shown commands run separate `kubectl exec` and `curl` invocations. Changed the comment to "same pod, different method and path."

## Review Notes
The CiliumNetworkPolicy API version, `rules.http` structure, HTTP method/path matching, Envoy-based L7 proxy explanation, demo commands, expected outputs, and raw policy URL were verified against official Cilium and Kubernetes documentation. Cilium documents HTTP `method` and `path` as extended POSIX regex matches, so the regex path example is valid.

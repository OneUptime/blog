# Validation Summary: Compare L3/L4 Network Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint CRD
- Hubble
- eBPF-based network policy

## Sources Consulted
- Cilium Star Wars demo: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium policy enforcement modes and endpoint selectors: https://docs.cilium.io/en/latest/security/policy/intro.html
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium endpoint troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/

## Issues Found
- The post described the tutorial as covering "identity-based IP and port policies." Cilium's pod-to-pod policy model in this demo is identity and label based rather than an IP-based firewall rule, so this was changed to "identity and port policies."
- The endpoint inspection commands used `cilium endpoint list` and `cilium endpoint get`, but current Cilium documentation exposes endpoint inspection through `cilium-dbg` or the Kubernetes `CiliumEndpoint` CRD. The example was changed to use `kubectl get ciliumendpoints -o json` and read `.status.policy`, which matches the documented CRD behavior.
- The best-practice statement said to always specify both `fromEndpoints` and `toPorts`. L3-only Cilium policies are valid, so the wording was narrowed to recommend both fields for least-privilege service access when the destination port is known.

## Review Notes
The CiliumNetworkPolicy YAML, Star Wars demo labels, service port, `kubectl exec` test commands, and explanation of identity-based enforcement match the official Cilium Star Wars demo. The post uses the `HEAD` branch URL for the demo manifest; this is workable but a pinned Cilium release URL would be more reproducible in future revisions.

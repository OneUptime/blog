# Validation Summary: Securing Cilium Policy Language: Advanced Policy Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumCIDRGroup
- Hubble
- YAML

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy.html
- Cilium Layer 3 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes Constructs in Policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- CiliumCIDRGroup documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumcidrgroup/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The post description mentioned "conditional rules", but the article examples cover L7-aware HTTP rules rather than conditional policy rules. Changed the description to say "L7-aware rules" so it matches the content.
- The verification command used `cilium endpoint list`, but current Cilium documentation exposes endpoint inspection through `cilium-dbg endpoint list`. Updated the example to run `cilium-dbg endpoint list` from the Cilium DaemonSet with `kubectl exec`.
- The troubleshooting entity list was incomplete. Updated it to include the documented entities: host, remote-node, kube-apiserver, ingress, cluster, init, health, unmanaged, world, and all.
- The service account troubleshooting note referenced the outdated endpoint inspection command. Updated it to the same current `cilium-dbg endpoint list` form.

## Review Notes
The policy examples use current Cilium CRDs and fields: `fromEntities`, service-account labels, `fromCIDRSet` with `cidrGroupRef`, and HTTP L7 `rules.http` with header matching. The examples are version-neutral for current Cilium releases, but cluster-specific labels such as `io.cilium.k8s.policy.cluster: default` assume the cluster is named `default`.

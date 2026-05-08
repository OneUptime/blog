# Validation Summary: Securing Host Policy Adjustment in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumClusterwideNetworkPolicy
- CiliumNetworkPolicy
- Cilium host firewall
- Hubble
- eBPF
- Helm

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 3 Policy examples: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium DNS policy documentation: https://docs.cilium.io/en/latest/security/dns/
- Cilium CLI command reference for `cilium status`, `cilium config view`, and `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/
- Cilium daemon CLI command reference for `cilium-dbg endpoint list`, `cilium-dbg identity list`, `cilium-dbg policy get`, and `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/
- Cilium Hubble setup and CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/ and https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The introduction described host firewall hardening as using `CiliumNetworkPolicy`. Host policies use `CiliumClusterwideNetworkPolicy` with `nodeSelector`, so the wording was corrected.
- The prerequisites did not state that Cilium's host firewall must be enabled or that the Hubble CLI must be installed for the `hubble observe` examples. Added those requirements.
- The host policy verification command used `kubectl get cnp -n production` for a cluster-scoped `CiliumClusterwideNetworkPolicy`. Changed it to `kubectl get ccnp host-policy-baseline`.
- The default-deny example was presented as a host policy even though it used a namespaced `CiliumNetworkPolicy` and `endpointSelector`, which targets workload endpoints. Updated the surrounding text, comment, and policy name to identify it as a workload namespace default-deny policy.
- The article used top-level `cilium` commands for daemon-local operations such as listing identities, listing endpoints, listing policy, and monitoring drops. Updated those examples to use Kubernetes CRDs or `kubectl exec ds/cilium -- cilium-dbg ...`, matching the current Cilium command split.
- The `cilium policy get` example depended on daemon policy output that is deprecated in current Cilium documentation. Replaced it with `kubectl get cnp --all-namespaces` and `kubectl get ccnp`.
- The monitor command used unsupported `cilium monitor --output json` syntax for current Cilium tooling. Replaced it with `cilium-dbg monitor --type drop --json` executed in the Cilium DaemonSet.

## Review Notes
- The policy examples use placeholder labels and CIDRs such as `role: worker` and `10.0.0.0/8`; operators must adapt these to their actual node labels and network ranges.
- `policyEnforcementMode=always` is technically valid but high risk on existing clusters unless health, DNS, API server, and node-management traffic are explicitly allowed and tested first.

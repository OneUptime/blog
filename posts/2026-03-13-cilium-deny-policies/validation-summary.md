# Validation Summary: Deny Policies in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Kubernetes NetworkPolicy
- Hubble
- eBPF policy maps

## Sources Consulted
- Cilium Deny Policies documentation: https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 4 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer4/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy.html
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for cilium-dbg bpf policy get: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html

## Issues Found
- The introduction described standard Kubernetes NetworkPolicy as if all traffic is always denied until allowed. Cilium's default policy behavior is that endpoints start unrestricted and move to default-deny per direction when selected by a policy. Updated the wording to reflect policy-selected pods.
- The introduction referred to same or lower-priority policy tiers and deny evaluation after allow rules in the same policy. Cilium deny policies take precedence over allow policies across CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, and Kubernetes NetworkPolicy; the post now states that directly.
- The prerequisite listed Cilium v1.11+ for explicit deny. Official Cilium docs say deny policies have been available and enabled by default since Cilium 1.9, so the prerequisite was changed to v1.9+.
- Step 2 used `ingressDeny` with HTTP path and method rules. Cilium deny policies do not support L7 policy enforcement such as denying a specific URL. Reworked the example to deny a separate admin TCP port while allowing the regular API port.
- The validation command expected HTTP 403 for deny policy enforcement. L3/L4 policy denials are normally dropped and result in timeout or connection failure, while HTTP 403 applies to L7 proxy policy denials. Updated the command and expected result.
- The debug commands used `cilium endpoint list` and `cilium bpf policy get <endpoint-id>`. Current Cilium command reference documents these agent-side debug commands as `cilium-dbg endpoint list` and `cilium-dbg bpf policy get --all`; updated the commands.
- The conclusion implied deny policies could block any specific traffic. Since Cilium deny policies do not support L7 URL denial, clarified that `ingressDeny` and `egressDeny` block specific L3/L4 traffic.

## Review Notes
The YAML examples use current Cilium CRD kinds and fields. The cluster-wide metadata endpoint example is technically valid as an egress deny pattern, but production clusters may need additional cloud-provider-specific metadata endpoints or identity-based controls depending on the environment.

# Validation Summary: Troubleshooting Sample Network Policies in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Hubble
- Helm
- DNS/FQDN network policies
- Layer 7 HTTP policy enforcement

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Policy Enforcement documentation: https://docs.cilium.io/en/stable/security/network/policyenforcement.html
- Cilium Layer 7 Policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7.html
- Cilium DNS-based Policy documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium command reference for `cilium-dbg fqdn cache list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html

## Issues Found
- The post used `cilium status | grep "L7 Proxy"` as the L7 proxy check. The current Kubernetes Cilium CLI documents configuration inspection through `cilium config view`, while the Helm value for Layer 7 network policy support is `l7Proxy`. Changed the command to check `enable-l7-proxy` through `cilium config view`.
- The post described the decision point and troubleshooting text as "Envoy enabled." Cilium's current docs describe L7 policy enforcement as requiring L7 proxy support; Envoy may run embedded in the agent pod or as a DaemonSet. Updated the wording to "L7 proxy support" to avoid implying the standalone `envoy.enabled` Helm value is required.
- The post used `cilium fqdn cache list` and `cilium endpoint list`, but these are `cilium-dbg` commands in the current official command reference. Updated the examples to execute `cilium-dbg fqdn cache list` and `cilium-dbg endpoint list` from a Cilium agent pod.
- Added a Cilium DaemonSet restart after changing the `l7Proxy` Helm value because Cilium configuration changes require Cilium pods to pick up the updated configuration.

## Review Notes
The remaining examples and explanations are technically consistent with Cilium's current policy model: policies are whitelist-based, selected endpoints enter default-deny per direction, CiliumEndpoint status exposes endpoint policy state, DNS visibility for `toFQDNs` requires DNS proxy interception through an explicit DNS policy rule, and HTTP path matching uses extended POSIX regular expressions.

# Validation Summary: How to Troubleshoot Intermittent DNS Resolver Failures with Cilium

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- DNS
- CiliumNetworkPolicy
- Hubble
- Helm
- eBPF

## Sources Consulted
- Cilium Layer 7 DNS policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium toFQDNs and DNS debugging documentation: https://docs.cilium.io/en/latest/contributing/development/debugging/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `cilium-dbg fqdn cache list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/

## Issues Found
- The introduction said the Cilium DNS proxy intercepts all DNS traffic. Cilium documentation states DNS interception is tied to Layer 7 DNS policy/proxy redirection for egress DNS traffic, so the text was changed to clarify that interception applies when Layer 7 DNS policy is configured.
- The failure symptoms only mentioned `NXDOMAIN` and `SERVFAIL`. Cilium's DNS proxy returns `REFUSED` for denied DNS requests by default and can be configured to return NXDOMAIN, so the symptom list was expanded to include timeouts and `REFUSED`.
- The architecture diagram labeled the Cilium DNS proxy as "port 53". Cilium's in-agent DNS proxy can listen on an OS-assigned port while redirecting DNS traffic, so the label was changed to "Cilium DNS Proxy redirect".
- Step 4 used an invalid Helm value, `dnsPolicy.resolutionCellularThrottlingLimit`, and described it as a DNS proxy timeout for slow upstream resolvers. This was replaced with the documented `dnsProxy.minTtl` value, which addresses the post's stated cache-expiration failure mode.
- The common causes list referred to UDP timeout misconfiguration without a Cilium-specific setting or supporting command, and vaguely described conflicts between CoreDNS and Cilium's DNS proxy. It was narrowed to missing DNS allow rules, CoreDNS errors, or policy blocking the DNS target server, which matches the policy example and Cilium DNS debugging documentation.

## Review Notes
The snippets are intentionally generic and omit full CiliumNetworkPolicy metadata and selectors in Step 5; this is acceptable for illustrating the `toPorts` DNS rule, but a future version could include a complete manifest for easier copy-paste use.

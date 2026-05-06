# Validation Summary: How to Configure Cilium IPv6 Network Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- IPv6
- Hubble
- DNS and FQDN-based egress policy
- HTTP Layer 7 policy

## Sources Consulted
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 policies: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 policies: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Kubernetes policy constructs: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium DNS and FQDN policies: https://docs.cilium.io/en/stable/security/dns/
- Cilium Endpoint CRD: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Hubble observe flag definitions in official source: https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/flows.go

## Issues Found
- The original in-cluster `fromCIDR` example used a pod CIDR to match pod traffic. Cilium documents that CIDR policies do not apply when both sides are Cilium-managed endpoints, so this was replaced with a `fromEndpoints` selector that matches Cilium-managed pods across namespaces.
- Two IPv6 examples were syntactically invalid: `2001:db8:trusted::/48` and `fd00:vpn::/64`. These were replaced with valid example IPv6 prefixes.
- The DNS egress snippets allowed only UDP/53 and did not include DNS L7 rules. Cilium documents that `toFQDNs` relies on DNS proxy-based policy, so the examples were updated to use `protocol: ANY` with `rules.dns.matchPattern: "*"` where needed.
- The HTTP L7 POST rule used `/api/v1/data` without an end anchor, which was broader than the text implied. It was tightened to `/api/v1/data$`.
- The verification section used stale or incorrect commands: `cilium endpoint ...` is no longer the documented interface, `hubble observe --ip-version ipv6` uses the wrong filter value, and the `curl` example used an invalid IPv6 URL. These were replaced with `CiliumEndpoint`-based inspection commands, `hubble observe --ipv6`, and a valid service-DNS-based IPv6 curl example.

## Review Notes
- Current Cilium documentation notes that `toFQDNs` depends on the DNS proxy and L7 proxy path being available.
- Current Cilium documentation also notes a kernel caveat for Layer 7 policy on SNATed IPv6 pod-to-world traffic. The in-cluster HTTP example in the post is fine, but external IPv6 L7 scenarios remain version and kernel dependent.

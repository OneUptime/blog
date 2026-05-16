# Validation Summary: How to Use Cilium Network Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Kubernetes NetworkPolicy
- Hubble
- Kubernetes CLI / kubectl

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Kubernetes policy examples: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Layer 3 policy examples, entities, CIDR, and FQDN rules: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium deny policy documentation: https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium CLI reference for cilium-dbg endpoint, policy, monitor, and identity commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Talos Linux Cilium deployment documentation: https://www.talos.dev/latest/kubernetes-guides/network/deploying-cilium/

## Issues Found
- The DNS allow examples allowed port 53 traffic but did not include Cilium DNS L7 rules. This is especially important for the `toFQDNs` example because Cilium needs DNS proxy visibility for FQDN policy. I changed the DNS port protocol to `ANY` and added `rules.dns` with `matchPattern: "*"` in both DNS policy snippets.
- The frontend policy comment said `fromEntities: world` allowed traffic from any source. In Cilium, `world` means endpoints outside the cluster, not all sources. I changed the comment to say outside the cluster.
- The CIDR example used a broad `toCIDR` allow followed by a `toCIDRSet` exception, which would not block the restricted subnet because the broader allow still matched. I changed it to a single `toCIDRSet` rule with `except` and the intended port restriction.
- The Cilium debugging commands used `cilium` subcommands and an invalid `cilium policy get --numeric <endpoint-id>` pattern. Current Cilium agent troubleshooting uses `cilium-dbg`, so I updated the commands to `cilium-dbg endpoint list`, `cilium-dbg endpoint get`, `cilium-dbg policy get`, `cilium-dbg monitor`, and `cilium-dbg identity list`.

## Review Notes
The post is technically relevant and the corrected examples match current Cilium and Kubernetes policy behavior. The guide assumes Cilium and Hubble are already installed and enabled on Talos Linux; a future post could explicitly call that out, but it is not a correctness issue for this policy-focused article.

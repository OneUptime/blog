# Validation Summary: How to Map Calico Product Editions to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico policy tiers
- DNS/FQDN-based egress policy
- Calico flow logs, Whisker, and Goldmane
- iptables, nftables, eBPF, VXLAN, and IP-in-IP

## Sources Consulted
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Cloud DNS policy documentation: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico Enterprise GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalnetworkpolicy
- Calico Open Source policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source RBAC for tiered policies documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico Open Source log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source observability documentation: https://docs.tigera.io/calico/latest/observability/
- Calico Cloud Service Graph documentation: https://docs.tigera.io/calico-cloud/tutorials/calico-cloud-features/service-graph
- Calico Cloud alerts documentation: https://docs.tigera.io/calico-cloud/observability/alerts
- Calico Enterprise network visualization documentation: https://docs.tigera.io/calico-enterprise/latest/observability/visualize-traffic
- Calico Enterprise compliance reporting documentation: https://docs.tigera.io/calico-enterprise/latest/compliance/overview

## Issues Found
- The post described VXLAN as a dataplane alongside iptables and eBPF. Updated the wording to distinguish Linux dataplanes from encapsulation modes such as VXLAN and IP-in-IP.
- The post implied denied traffic is logged automatically to the kernel audit log. Updated this to say Calico logs matched traffic when explicit `Log` rules are configured.
- The post understated current Calico Open Source observability by saying allowed-flow visibility was limited to metrics or `conntrack`. Updated it to mention Whisker, Goldmane, explicit `Log` rules, Felix metrics, and node-level tools.
- The FQDN policy example allowed `api.stripe.com` but omitted explicit egress `types`, DNS allowance, and the TCP/443 port match described by the scenario. Updated the YAML to include `types: Egress`, allow UDP DNS, and restrict the domain rule to TCP port 443.
- The post implied policy tiers were Enterprise-only and Open Source policies were evaluated only in a flat model. Updated the section to reflect current Calico Open Source tiered policy and RBAC support, while preserving the Cloud/Enterprise distinction for product workflows, dashboards, alerts, and compliance reporting.

## Review Notes
Calico Enterprise compliance reporting documentation marks the current compliance feature as deprecated and says it will be replaced in a future release. The post's general claim that Enterprise can produce compliance reports is still accurate today, but future updates should re-check the replacement reporting system.

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
- Calico eBPF and iptables dataplanes
- Calico DNS/FQDN policy
- Calico observability, flow logs, and compliance reporting

## Sources Consulted
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Enterprise GlobalNetworkPolicy resource reference, including `destination.domains`: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalnetworkpolicy
- Calico Cloud DNS policy documentation: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico Open Source policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/
- Calico Cloud tiered policy documentation: https://docs.tigera.io/calico-cloud/network-policy/policy-tiers/tiered-policy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico datapath architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico eBPF overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico Enterprise network visualization documentation: https://docs.tigera.io/calico-enterprise/latest/observability/visualize-traffic
- Calico Enterprise compliance reporting documentation: https://docs.tigera.io/calico-enterprise/latest/compliance/overview
- Calico Cloud audit logs documentation: https://docs.tigera.io/calico-cloud/visibility/elastic/audit-overview
- Calico Open Source Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The post referred to `CalicNetworkPolicy`, which is not a Calico resource kind. Changed this to Kubernetes `NetworkPolicy` and Calico `NetworkPolicy`.
- The post said all editions can log denied connections to the kernel audit log. Calico documents `Log` policy rules, with iptables logs usually available through journald, syslog, or kern.log, and eBPF logs through trace pipe. Updated the wording to say Calico can generate policy logs with `Log` rules.
- The post implied Open Source visibility into allowed flows comes only from Felix Prometheus metrics or `conntrack`. Felix metrics are component and policy metrics, not a built-in graphical per-flow dashboard. Updated the wording to include explicit `Log` rules, component metrics, and node-level tools such as `conntrack` and packet captures.
- The post called `domains` a selector and implied it allows by DNS name regardless of IP address changes. Calico documents this as a `destination.domains` match for egress Allow rules and implements domain policy by learning DNS-to-IP mappings, with caveats when multiple domains share an IP. Updated the description to use `destination.domains` and mention DNS-based behavior.
- The post stated that policy tiers are Enterprise-only and that Open Source policies are evaluated in a single flat namespace. Current Calico Open Source documentation includes policy tiers and tier RBAC. Updated Scenario 3 and the diagram to describe tiers as available in Open Source, with Cloud/Enterprise adding product workflows around visibility, audit, and reporting.
- The introduction said the third scenario covered service mesh interaction, but Scenario 3 covered cross-namespace communication. Updated the introduction to match the actual scenario.
- The conclusion and best-practices comparison overstated cross-team policy governance as something Open Source cannot replicate. Updated the comparison to focus commercial-edition value on DNS-name egress, integrated observability, alerting, and compliance workflows.

## Review Notes
- The `GlobalNetworkPolicy` YAML is syntactically consistent with Calico Enterprise/Cloud domain policy rules: `domains` is under `destination`, the parent rule action is `Allow`, and the final `Deny` rule has no `domains` field.
- Calico Enterprise documentation marks the current compliance reporting system as deprecated and planned for replacement. The post's high-level compliance reporting claim remains accurate, but future updates should revisit this area.

# Validation Summary: How to Understand Calico Product Editions

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes CNI
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico dataplanes: iptables, nftables, eBPF, VPP, and Windows HNS

## Sources Consulted
- Tigera Calico product editions: https://docs.tigera.io/calico/latest/about/calico-product-editions
- Tigera Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Tigera GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Tigera Calico networking options: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Tigera Calico overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Tigera Calico Cloud observability dashboards: https://docs.tigera.io/calico-cloud/observability/dashboards
- Tigera Calico Cloud flow logs overview: https://docs.tigera.io/calico-cloud/observability/elastic/overview
- Tigera Calico Cloud multi-cluster overview: https://docs.tigera.io/calico-cloud/multicluster/overview
- Tigera Calico Cloud compliance reports: https://docs.tigera.io/calico-cloud/compliance/overview
- Tigera Calico Cloud usage and billing: https://docs.tigera.io/calico-cloud/operations/usage-metrics
- Tigera Calico Enterprise tiered policy RBAC: https://docs.tigera.io/calico-enterprise/latest/network-policy/policy-tiers/rbac-tiered-policies
- Tigera Calico Enterprise Helm installation: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/kubernetes/helm
- Tigera Calico Enterprise install options: https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/kubernetes/options-install

## Issues Found
- The post said Calico comes in three distinct editions. Tigera's current product edition documentation also lists Calico Cloud Free Tier, so the wording was changed to "several editions" and the Calico Cloud section now notes the Free Tier while keeping the post focused on the three main offerings discussed.
- The Open Source capability list included DNS policies. Current Calico Open Source network policy documentation lists ordered policy, deny/log actions, flexible selectors, `Pass`, and global policies, while DNS/FQDN-based policy is documented under commercial editions. The Open Source bullet was corrected accordingly.
- The Open Source dataplane list omitted currently documented dataplanes. The bullet was updated to include nftables and VPP alongside iptables, eBPF, and Windows HNS.
- The Cloud compliance bullet described PCI/SOC2 reports. Current Tigera documentation describes deprecated compliance reporting based on archived flow and audit logs, including CIS benchmark reporting. The bullet was corrected and marked deprecated.
- The post said Calico Cloud uses per-node pricing. Current Tigera documentation describes usage-based pricing, with standard pricing listed per vCPU-hour. The wording was changed to usage-based SaaS pricing.
- The best-practice note about on-premises compliance reporting was adjusted to "self-managed compliance reporting" to align with the current Calico Enterprise positioning and compliance deprecation notice.
- The Enterprise section said it includes everything in Calico Cloud plus additional features. Current Tigera documentation positions Calico Cloud as the SaaS platform and Calico Enterprise as the self-managed platform, so the wording was changed to describe comparable enterprise capabilities in a self-managed deployment.

## Review Notes
Calico Cloud and Calico Enterprise compliance reporting is still documented, but Tigera marks the current compliance reporting feature as deprecated and planned for removal after replacement by a new system. Future updates should revisit this section when Tigera's replacement compliance system is generally documented.

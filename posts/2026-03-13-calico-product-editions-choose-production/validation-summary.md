# Validation Summary: How to Choose Calico Product Editions for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes
- Kubernetes NetworkPolicy
- CNI
- Network policy tiers and RBAC
- Compliance reporting
- Multi-cluster networking and policy management

## Sources Consulted
- Calico product editions and feature comparison: https://docs.tigera.io/calico/latest/about/calico-product-editions
- Calico Open Source network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico Open Source policy tiers: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source RBAC for tiered policies: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico Cloud architecture: https://docs.tigera.io/calico-cloud/get-started/cc-arch-diagram
- Calico Cloud upgrade documentation: https://docs.tigera.io/calico-cloud/get-started/upgrade-cluster
- Calico Cloud compliance reports: https://docs.tigera.io/calico-cloud/compliance/overview
- Calico Enterprise compliance reports: https://docs.tigera.io/calico-enterprise/latest/compliance/overview
- Calico Cloud alerts and threat feeds: https://docs.tigera.io/calico-cloud/observability/alerts
- Calico Cloud suspicious domains: https://docs.tigera.io/calico-cloud/threat/suspicious-domains
- Calico Enterprise suspicious domains: https://docs.tigera.io/calico-enterprise/latest/threat/suspicious-domains
- Calico Enterprise multi-cluster federation overview: https://docs.tigera.io/calico-enterprise/latest/multicluster/federation/overview
- Calico Cloud cluster mesh: https://docs.tigera.io/calico-cloud/multicluster/kubeconfig
- Upgrade from Calico to Calico Enterprise: https://docs.tigera.io/calico-enterprise/latest/getting-started/upgrading/upgrading-calico-to-calico-enterprise/upgrade-to-tsee/standard

## Issues Found
- The post listed automated audit reports as simply available in Calico Cloud and Calico Enterprise. Current Calico Cloud and Calico Enterprise documentation marks the current compliance reporting feature as deprecated and scheduled for replacement, so the compliance table now calls out that caveat.
- The post said small teams save time on Calico upgrades by using Calico Cloud. Calico Cloud provides a managed SaaS control plane, but managed cluster upgrades still require the documented reinstall/upgrade workflow from the web console. The wording now focuses on centralized policy management, reporting, troubleshooting, and observability.
- The post listed hierarchical policy tiers with RBAC as Enterprise-only. Current Calico Open Source, Calico Cloud, and Calico Enterprise documentation all cover tiered policy, and Calico Open Source documents RBAC for tiered policies. The feature mapping was corrected.
- The post used "multi-cluster federated network policy" broadly for Cloud or Enterprise. Calico documentation distinguishes multi-cluster management, cluster mesh, federated endpoint identity, and remote-identity-aware policy from policy resource federation. The wording was narrowed to multi-cluster policy management, remote-identity-aware policy, and cluster mesh.
- The post said Open Source to Cloud/Enterprise migrations are supported without reinstalling the CNI. Calico Enterprise upgrade support depends on prerequisites such as operator-based installation and Kubernetes datastore, and platform limitations apply. The best-practice bullet now says migrations are supported but prerequisites and limitations vary.

## Review Notes
Calico feature availability is product- and version-sensitive, especially around compliance reporting, container threat detection, and managed Kubernetes platform limitations. Future updates should re-check the current Calico product matrix and relevant installation or upgrade pages before making edition-selection recommendations.

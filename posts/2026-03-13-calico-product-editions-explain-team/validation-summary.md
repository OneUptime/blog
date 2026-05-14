# Validation Summary: How to Explain Calico Product Editions to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes CNI
- Calico network policy
- Calico DNS/FQDN-based policy
- Calico compliance reporting
- Calico threat detection
- Calico Enterprise CRDs

## Sources Consulted
- Tigera Calico product editions overview: https://docs.tigera.io/calico-cloud/about/
- Tigera Calico product comparison: https://docs.tigera.io/
- Tigera Calico Cloud architecture: https://docs.tigera.io/calico-cloud/get-started/cc-arch-diagram
- Tigera Calico Cloud system requirements: https://docs.tigera.io/calico-cloud/get-started/connect/requirements/system-requirements
- Tigera Calico Cloud cluster connection behavior: https://docs.tigera.io/calico-cloud/get-started/connect-cluster
- Tigera Calico Enterprise resource definitions: https://docs.tigera.io/calico-enterprise/latest/reference/resources/overview
- Tigera Calico Enterprise GlobalThreatFeed resource: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalthreatfeed
- Tigera Calico Enterprise packet capture: https://docs.tigera.io/calico-enterprise/latest/observability/packetcapture
- Tigera Calico Enterprise policy recommendations: https://docs.tigera.io/calico-enterprise/latest/network-policy/recommendations/policy-recommendations
- Tigera Calico Enterprise PolicyRecommendationScope resource: https://docs.tigera.io/calico-enterprise/latest/reference/resources/policyrecommendations
- Tigera Calico Enterprise DNS policy: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Tigera Calico Cloud compliance reports: https://docs.tigera.io/calico-cloud/compliance/overview
- Tigera Calico Enterprise compliance reports: https://docs.tigera.io/calico-enterprise/latest/compliance/overview

## Issues Found
- The post described Calico as having exactly three editions. Current Tigera documentation also identifies Calico Cloud Free Tier, so the wording was changed to "main editions" while keeping the post focused on Open Source, Cloud, and Enterprise.
- The security table referred to PCI/SOC2 compliance reports. Current Tigera documentation describes compliance evidence and reports based on archived flow and audit logs, and marks the current compliance reports feature as deprecated. The table was corrected to avoid framework-specific claims and note the deprecation.
- The audit sentence said regulated teams need Cloud or Enterprise to pass audits. That was too absolute, so it now says these editions help gather audit evidence.
- The platform section said all three editions share the same core data model and CRDs. Current documentation shows Cloud and Enterprise add commercial CRDs, so the wording was narrowed to a shared core data model with additional commercial CRDs.
- The migration guidance said moving from Open Source to Cloud or Enterprise does not require reinstalling the CNI or re-IPing nodes. Current Calico Cloud documentation describes supported in-place updates/migrations, but with platform and install-method prerequisites. The statement was softened to require validation before assuming no CNI changes.
- The Enterprise-only resource example used `PolicyRecommendation`; current user-facing resource documentation centers on `PolicyRecommendationScope` and staged network policies for policy recommendations. The example was corrected to `PolicyRecommendationScope`.

## Review Notes
Calico Cloud and Calico Enterprise compliance reports are still documented, but Tigera marks the current compliance reporting feature as deprecated and planned for removal after replacement by a new system. Future updates should revisit the compliance wording when Tigera publishes the replacement system.

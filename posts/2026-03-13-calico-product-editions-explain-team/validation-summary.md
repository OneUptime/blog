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
- Calico compliance reporting
- Calico threat detection and observability

## Sources Consulted
- Tigera Calico documentation product overview: https://docs.tigera.io/
- Tigera Calico Cloud overview and product editions: https://docs.tigera.io/calico-cloud/
- Tigera Calico Cloud architecture: https://docs.tigera.io/calico-cloud/get-started/connect/cc-arch-diagram
- Tigera Calico Cloud connect-cluster behavior: https://docs.tigera.io/calico-cloud/get-started/connect-cluster
- Tigera Calico Cloud compliance reports: https://docs.tigera.io/calico-cloud/compliance/overview
- Tigera Calico Enterprise compliance reports: https://docs.tigera.io/calico-enterprise/latest/reference/resources/compliance-reports/overview
- Tigera Calico Enterprise GlobalThreatFeed resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalthreatfeed
- Tigera Calico Enterprise PacketCapture resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/packetcapture
- Tigera Calico Enterprise PolicyRecommendationScope resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/policyrecommendations
- Tigera Calico Enterprise resource overview: https://docs.tigera.io/calico-enterprise/latest/reference/resources/overview

## Issues Found
- The table referred to "Compliance reports (PCI, SOC2)." Current Tigera documentation describes compliance reports as evidence based on archived flow logs and audit logs, with report types such as inventory, network access, policy audit, and CIS Benchmark, and marks the current compliance reporting feature as deprecated. The table was changed to "Compliance evidence reports?" and notes the current feature deprecation for Cloud and Enterprise.
- The post listed `PolicyRecommendation` as an Enterprise CRD-based resource. Current Calico Enterprise documentation exposes `PolicyRecommendationScope` for configuring policy recommendations, while `PolicyRecommendation` is not listed in the supported resource overview. The resource name was corrected to `PolicyRecommendationScope`.

## Review Notes
Calico Cloud and Calico Enterprise compliance reporting is still documented, but Tigera marks the current compliance reporting feature as deprecated and planned for removal after a replacement system is available. Future updates should revisit this post when Tigera documents the replacement compliance system.

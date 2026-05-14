# Validation Summary: How to Choose Network Policy Fundamentals in Calico for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico network policy
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico policy tiers
- Kubernetes RBAC
- Network policy default-deny strategies
- Calico Enterprise/Cloud flow logs

## Sources Consulted
- Calico Open Source documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Open Source documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Open Source reference: NetworkPolicy - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source reference: GlobalNetworkPolicy - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: Policy tiers - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/
- Calico Open Source documentation: Get started with policy tiers - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico Open Source documentation: Use service accounts rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico Open Source documentation: Use ICMP/ping rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico Enterprise documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico Enterprise documentation: Flow log data types - https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes

## Issues Found
- The default-deny Calico NetworkPolicy example used explicit `Deny` rules under `ingress` and `egress`. Calico documentation recommends default deny for Kubernetes pods by selecting workloads and setting `types` with no allow rules. I changed the snippet to use `types: [Ingress, Egress]` without explicit deny rules, which avoids ordering problems where an explicit deny can preempt later allow policies.
- The post said tiers require Calico Enterprise. Current Calico Open Source documentation includes tier resources, tiered policy workflow, and RBAC guidance for tiered policies. I removed the Enterprise-only wording and reframed the prerequisite around choosing Calico capabilities such as staged policy, policy recommendations, and flow logs.
- The Enterprise-specific best-practice bullet and conclusion wording for tiers were updated to refer to Calico tiers generally.

## Review Notes
The remaining distinctions between Kubernetes NetworkPolicy and Calico NetworkPolicy are consistent with official docs: Calico adds explicit deny/log actions, ordering, GlobalNetworkPolicy, ICMP matching, and service account selectors, while Kubernetes NetworkPolicy remains the portable standard API. Flow logs and staged policy capabilities remain edition-specific, so the post now refers to Enterprise/Cloud features where appropriate.

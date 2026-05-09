# Validation Summary: How to Test RBAC for Calico Tiered Policies with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes RBAC
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico policy tiers
- calicoctl
- Felix Prometheus metrics

## Sources Consulted
- Calico Open Source documentation: Configure RBAC for tiered policies, https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico Open Source documentation: Get started with policy tiers, https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source documentation: Tier resource, https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Enterprise documentation: Policy metrics, https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics

## Issues Found
- The introduction described RBAC for tiered policies as a network security control. Updated it to say RBAC provides access control for tiered policy resources, while Calico policies enforce traffic behavior.
- The article listed `GlobalNetworkPolicy` and `NetworkPolicy` as the relevant resources but omitted `Tier`. Added `Tier` to the description because tiered policy uses Tier resources.
- The YAML example claimed to demonstrate tiered policy but did not create or reference a tier. Added a `Tier` resource and set `spec.tier: security` on the `NetworkPolicy` so the example reflects tiered policy usage.
- The troubleshooting advice used `calicoctl apply --dry-run`, which is not a documented `calicoctl apply` option. Replaced it with `calicoctl validate -f test-rbac-tiered-policies.yaml`, which is documented for offline resource validation.
- The metrics command searched for `felix_denied`, which is not a documented Felix metric. Changed it to check exposed Felix metrics with `grep '^felix_'`. Per-policy deny counters such as `calico_denied_packets` are Calico Enterprise policy metrics, not the standard Felix metrics endpoint shown in the post.

## Review Notes
The post is technically relevant and contains implementation details. It still assumes that the example namespace, pods, labels, services, and Felix metrics endpoint already exist in the reader's cluster; those are operational prerequisites rather than syntax errors in the shown commands.

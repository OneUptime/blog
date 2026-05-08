# Validation Summary: How to Validate RBAC for Calico Tiered Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico tiered policies
- Calico `projectcalico.org/v3` resources
- Kubernetes RBAC
- Kubernetes `kubectl`
- Calico `NetworkPolicy`, `GlobalNetworkPolicy`, and `Tier`

## Sources Consulted
- Calico documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico documentation: Tier resource reference - https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl get reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply reference - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl validate reference - https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Kubernetes documentation: RBAC authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post described RBAC for Calico tiered policies but the original YAML was a Calico `NetworkPolicy` traffic policy, not an RBAC configuration. Replaced it with Kubernetes `ClusterRole`, `ClusterRoleBinding`, and `RoleBinding` examples that use Calico's documented `tiers` and `tier.networkpolicies` pseudo resources.
- The original explanation framed RBAC as network security enforcement. Updated it to describe access control for viewing and modifying Calico policy and tier resources.
- The original `calicoctl apply --dry-run` recommendation was invalid for `calicoctl apply`. Replaced it with `kubectl apply --dry-run=server` for the RBAC manifest.
- The implementation steps tested pod connectivity and Felix deny metrics, which validate network policy behavior rather than RBAC behavior. Replaced them with `kubectl --as=alice` checks against allowed and disallowed tiers.
- The operational commands used `calicoctl` against policy objects unrelated to the RBAC example. Replaced them with `kubectl` commands using Calico's `networkpolicies.p` and `globalnetworkpolicies.p` resource aliases.
- The architecture diagram described dataplane policy enforcement by Felix. Updated it to show user requests flowing through Kubernetes RBAC and Calico tier RBAC enforcement.
- The common issues section focused on selector matching, policy order, and DNS egress. Replaced those items with RBAC-specific issues such as missing tier access, pseudo resource names, and native CRD read-enforcement caveats.
- The version-specific prerequisite `Calico v3.26+` was not substantiated by the consulted official docs. Replaced it with a capability-based prerequisite: Calico tiered policy RBAC support enabled.

## Review Notes
The post is now technically aligned with Calico's documented RBAC model. One caveat remains for operators: when using native `projectcalico.org/v3` CRDs, Calico documents that admission webhooks can enforce create, update, and delete operations, but cannot enforce GET, LIST, or WATCH read requests.

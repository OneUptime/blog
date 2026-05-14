# Validation Summary: Common Mistakes to Avoid with RBAC for Calico Tiered Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes RBAC
- Calico NetworkPolicy
- Calico policy tiers
- calicoctl
- Felix Prometheus metrics

## Sources Consulted
- Calico documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Tier resource reference - https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl validate - https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The original policy example did not include a tier or any Kubernetes RBAC resources, even though the post was specifically about RBAC for Calico tiered policies. Added a `Tier`, set `spec.tier` on the Calico `NetworkPolicy`, and added Kubernetes RBAC examples using the documented `tiers` and `tier.networkpolicies` resources.
- The original implementation flow implied Calico policy and Kubernetes RBAC could be handled the same way. Updated the commands to apply Kubernetes RBAC with `kubectl` and validate/apply Calico resources with `calicoctl`.
- The post recommended `calicoctl apply --dry-run`, but the documented `calicoctl apply` options do not include `--dry-run`. Replaced it with `calicoctl validate -f ...`.
- The metrics command searched for `felix_denied`, which is not listed in the current Felix Prometheus metric reference. Replaced it with the documented `felix_active_local_policies` metric and changed the wording from hit counters to Felix policy metrics.
- The operational commands used a policy name that did not match the sample manifest. Updated the `get` and `delete` commands to use `avoid-mistakes-rbac-tiered-policies`.
- The selector troubleshooting example used a placeholder that could be confused with Calico selector syntax. Replaced it with a valid Kubernetes label selector example.
- The order troubleshooting note only mentioned global network policies. Updated it to include tier and namespaced policy order checks.

## Review Notes
- The post is now technically valid as a concise guide, but it still assumes the reader will replace `<USER>` and split the shown YAML into the referenced filenames before applying it.

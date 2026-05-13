# Validation Summary: How to Migrate to RBAC-Controlled Calico Tiered Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes RBAC
- Calico `projectcalico.org/v3` resources
- Calico tiered network policies
- `calicoctl`
- Felix Prometheus metrics

## Sources Consulted
- Calico documentation: Configure RBAC for tiered policies: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico documentation: Get started with policy tiers: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico documentation: Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enable native v3 CRDs: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: calicoctl apply: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl validate: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The original example showed only a Calico `NetworkPolicy`, but RBAC for tiered policies is configured with Kubernetes `Role`/`ClusterRole` and binding resources that use Calico pseudo-resources such as `tier.networkpolicies`. Added a `Tier`, a tiered `NetworkPolicy`, and the required RBAC examples.
- The prerequisites repeated an unverified version requirement and did not mention the Calico API server/native v3 CRD requirement or cluster-admin access needed to create tiers and RBAC resources. Updated the prerequisites to match the documented setup requirements.
- The post recommended `calicoctl apply --dry-run`, but the documented `calicoctl apply` command does not support `--dry-run`. Replaced it with `calicoctl validate -f <file>`.
- The implementation implied `calicoctl` could apply all resources. `calicoctl` only manages Calico resource types, while Kubernetes RBAC resources should be applied with `kubectl`. Updated the implementation commands and added a note to keep the resource files separate.
- The verification commands did not account for tier selection. Added `kubectl get networkpolicies.p --field-selector spec.tier=net-sec`, which is the documented way to filter Calico network policies by tier.
- The post referenced `felix_denied` as a policy hit counter, but the official Felix metrics reference does not list that metric. Replaced it with `felix_active_local_policies` as a documented Felix metric and described it as a metrics check rather than a policy hit counter.
- The selector troubleshooting command used a placeholder that could be confused with Calico selector syntax. Replaced it with a concrete Kubernetes label selector example.

## Review Notes
The corrected post now uses the documented tier RBAC model. Native `projectcalico.org/v3` CRDs have a documented limitation: tier RBAC is enforced for create, update, and delete operations through admission webhooks, but not for get, list, or watch operations.

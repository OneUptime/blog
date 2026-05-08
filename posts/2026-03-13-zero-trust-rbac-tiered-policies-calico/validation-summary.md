# Validation Summary: Zero Trust with RBAC for Calico Tiered Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico tiered network policies
- Calico `projectcalico.org/v3` API resources
- Kubernetes RBAC
- Kubernetes `kubectl`
- Calico `calicoctl`
- Felix Prometheus metrics

## Sources Consulted
- Calico documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico documentation: Get started with policy tiers - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico documentation: Tier resource - https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes documentation: RBAC authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: kubectl apply - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The original post described RBAC for tiered policies but only showed a Calico `NetworkPolicy`; it did not create a tier or any Kubernetes RBAC resources. I updated the YAML to include a `Tier`, placed the policy in that tier with `spec.tier`, and added a `ClusterRole`/`RoleBinding` pattern using Calico's documented `tier.networkpolicies` pseudo-resource.
- The policy name and operational commands did not match. I updated the commands to use `security.zero-trust-rbac-tiered-policies`, matching the tiered policy naming pattern shown in Calico examples.
- The combined YAML now includes Kubernetes RBAC objects, so `calicoctl apply` is not the correct command for the full manifest. I changed the implementation steps to use `kubectl apply --dry-run=server` for validation and `kubectl apply` for application.
- The post recommended `calicoctl apply --dry-run`, but the official `calicoctl apply` reference does not document a dry-run flag. I replaced that troubleshooting advice with the Kubernetes server-side dry-run command for the combined manifest.
- The Felix metric example used `felix_denied`, which is not listed in the official Felix Prometheus metric reference. I replaced it with the documented `felix_active_local_policies` metric and changed the wording from policy hit counters to Felix metrics.
- The DNS egress guidance only allowed UDP port 53. I added TCP port 53 as well, since DNS can require TCP.
- The selector troubleshooting command used a placeholder that did not reflect Kubernetes label selector syntax. I changed it to `kubectl get pods -l app=authorized-source`.

## Review Notes
The post is now technically aligned with the documented Calico tier/RBAC model and current CLI behavior. Future improvements could add a separate Calico-only manifest for `calicoctl validate`, but the current combined manifest is correctly applied through `kubectl`.

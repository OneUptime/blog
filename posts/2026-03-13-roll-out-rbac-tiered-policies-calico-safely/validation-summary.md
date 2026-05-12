# Validation Summary: How to Roll Out RBAC for Calico Tiered Policies Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico tiered network policies
- Calico `projectcalico.org/v3` API resources (`Tier`, `NetworkPolicy`)
- Kubernetes RBAC (`ClusterRole`, `RoleBinding`)
- Kubernetes `kubectl`
- Calico `calicoctl`
- Felix Prometheus metrics
- Mermaid (for architecture diagram)

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
- Sibling post in this repo with the same pattern correctly applied: `posts/2026-03-13-zero-trust-rbac-tiered-policies-calico/README.md`

## Issues Found
- The post described RBAC for tiered policies but the example YAML was a plain `NetworkPolicy` with no tier, no `Tier` resource, and no Kubernetes RBAC objects. Updated the manifest to include a `Tier` (`security`), placed the policy in that tier via `spec.tier: security`, prefixed the policy name with the tier (`security.roll-out-rbac-tiered-policies`) per Calico's tiered-policy naming rules, and added the documented `ClusterRole`/`RoleBinding` pattern using Calico's `tier.networkpolicies` pseudo-resource.
- The implementation step used `calicoctl apply -f ...` for what is now a combined Calico + Kubernetes RBAC manifest. `calicoctl` cannot apply Kubernetes RBAC objects, so I changed the apply commands to `kubectl apply --dry-run=server` for validation and `kubectl apply` for application.
- The "Common Issues" troubleshooting step recommended `calicoctl apply --dry-run`. The current official `calicoctl apply` reference does not document a `--dry-run` flag; replaced with `kubectl apply --dry-run=server -f roll-out-rbac-tiered-policies.yaml`, which is the supported way to do a server-side dry-run on the combined manifest.
- The Felix metric example grepped for `felix_denied`, which is not listed in the official Felix Prometheus metric reference and returns nothing on a stock install. Replaced with `felix_active_local_policies`, a documented Felix metric, and re-worded the step from "policy hit counters" to "Felix metrics".
- The DNS egress rule and troubleshooting note only covered UDP port 53. DNS can require TCP (for responses larger than 512 bytes / EDNS fallback), so I added a TCP/53 egress rule and updated the troubleshooting bullet to mention both protocols.
- The selector troubleshooting command used the placeholder `your-selector`, which is not a valid Kubernetes label selector. Replaced with `app=authorized-source` so the example matches the label used in the manifest.
- The operational commands referenced the non-existent policy name `roll-out-policy`. Updated to `security.roll-out-rbac-tiered-policies` to match the manifest.
- The Mermaid architecture diagram did not depict the RBAC layer, which is the central topic of the post. Added a `Kubernetes RBAC --> Controls access to --> Policy` edge so the diagram reflects the RBAC-for-tiered-policies model.
- The order-conflicts troubleshooting bullet only inspected `globalnetworkpolicies`. For tiered policies, tier order matters too; updated the bullet to also inspect `calicoctl get tiers -o wide`.

## Review Notes
- The post is now consistent with the Calico tiered-policy / RBAC reference model and uses the same pattern as the validated sibling post `2026-03-13-zero-trust-rbac-tiered-policies-calico`.
- The `Tier` `defaultAction: Deny` is intentional for an RBAC/zero-trust style example; on real clusters this is a high-impact setting and should be rolled out behind a staged policy first. The post's broader phrasing about validating in staging covers this, but it could be called out more explicitly in a future revision.
- The `tier.networkpolicies` (and `tier.globalnetworkpolicies`) pseudo-resources used in the `ClusterRole` are Calico-specific RBAC extensions; they only work when the Calico API server is deployed. This is implicit in the prerequisite "Calico tiered policy support" but worth flagging for readers running OSS Calico without the API server.
- `kubectl get networkpolicies.p ...` uses the `.p` short form to disambiguate the Calico `projectcalico.org` `NetworkPolicy` from the Kubernetes `networking.k8s.io` `NetworkPolicy`; this is correct and documented but can surprise readers used to plain `kubectl get networkpolicies`.

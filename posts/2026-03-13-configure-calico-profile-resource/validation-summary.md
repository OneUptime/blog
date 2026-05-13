# Validation Summary: Configure Calico Profile Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Profile resources
- Calico WorkloadEndpoint resources
- Calico NetworkPolicy and GlobalNetworkPolicy evaluation
- Kubernetes namespace profiles
- `calicoctl`
- YAML configuration

## Sources Consulted
- Calico Profile resource documentation: https://docs.tigera.io/calico/latest/reference/resources/profile
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Kubernetes controllers documentation: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl apply` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl patch` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post described Profile policy rules as a current reusable policy mechanism. Calico documentation marks Profile `ingress` and `egress` rule fields as deprecated in favor of NetworkPolicy and GlobalNetworkPolicy, so the post was updated to describe them as legacy/deprecated rule fields.
- The prerequisites and conclusion simplified policy evaluation as "profiles are evaluated after NetworkPolicies." Calico documents that NetworkPolicy and GlobalNetworkPolicy take precedence over Profile resources, and that `Pass` can jump to profile processing, so the wording was corrected.
- The Kubernetes namespace profile YAML included `pcns.projectcalico.org/kubernetes-namespace`, which was not supported by the consulted official Profile and automatic label documentation. The example now uses the documented `pcns.projectcalico.org/name` namespace profile label.
- Step 3 showed a Profile manifest but did not show how to create it with `calicoctl`. Added `calicoctl apply -f database-servers-profile.yaml`.
- The WorkloadEndpoint patch example omitted the namespace. WorkloadEndpoint is a namespaced resource and `calicoctl patch` documents `--namespace` for WorkloadEndpoint, so the command now includes `--namespace <namespace>`.

## Review Notes
The post is now technically accurate for current Calico documentation. Profile rule examples are still included because the Profile API still supports those fields, but future posts should steer readers toward NetworkPolicy and GlobalNetworkPolicy for new policy designs.

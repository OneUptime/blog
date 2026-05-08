# Validation Summary: Zero Trust with Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- StagedGlobalNetworkPolicy
- GlobalNetworkPolicy
- kubectl
- Calico flow logs / Whisker

## Sources Consulted
- Calico Open Source documentation: Staged global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Open Source documentation: Stage, preview impacts, and enforce policy, https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Open Source documentation: calicoctl apply reference, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source documentation: calicoctl validate reference, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The core YAML used `kind: NetworkPolicy` with a namespace, but a staged global policy must use `kind: StagedGlobalNetworkPolicy` and is not namespaced. Changed the kind, removed `metadata.namespace`, and added `namespaceSelector: projectcalico.org/name == 'production'` to scope the global policy to the production namespace.
- The post described staged policies as enforcing zero trust traffic controls. Calico staged policies preview behavior and do not change actual traffic flow. Updated the description, introduction, implementation comments, architecture diagram, and conclusion to distinguish preview from enforcement.
- The implementation and operational commands used `calicoctl` resource names for enforced policies. Official staged policy examples and aliases are documented for `kubectl`, and the `calicoctl apply` reference does not list staged policy resource types. Updated commands to use `kubectl apply`, `kubectl get stagedglobalnetworkpolicy`, and `kubectl delete stagedglobalnetworkpolicy`.
- The troubleshooting section recommended `calicoctl apply --dry-run`, but that flag is not documented for `calicoctl apply`. Replaced it with `kubectl apply --dry-run=server -f zero-trust-staged-globalnetworkpolicy.yaml`.
- The metrics example searched Felix metrics for `felix_denied`, which is not listed in the official Felix Prometheus metric reference and is not the documented way to preview staged policy impact. Replaced it with guidance to inspect Calico flow logs or Whisker `policies.pending` when available.
- The prerequisites listed `calicoctl` and a vague Calico v3.26+ "full support" requirement even though the corrected workflow uses `kubectl` and depends on the staged policy CRDs. Updated prerequisites accordingly.

## Review Notes
The corrected staged policy is suitable for previewing the effect of a zero trust policy. To actually enforce the policy after validation, operators must create an equivalent enforcing `GlobalNetworkPolicy`.

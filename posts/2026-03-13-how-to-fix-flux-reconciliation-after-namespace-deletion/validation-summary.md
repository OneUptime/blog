# Validation Summary: How to Fix Flux Reconciliation After Namespace Deletion

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Kustomize Controller and Flux CLI
- Kubernetes namespaces, finalizers, RBAC, and kubectl
- jq
- Kyverno admission policies

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux `get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `suspend kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kyverno ValidatingPolicy documentation: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno deprecated ClusterPolicy validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The Flux inventory diagnostic command used `jsonpath` output and then piped it to `jq`, which would not reliably produce valid JSON for `jq`. Changed it to request full JSON with `-o json` and filter `.status.inventory.entries[]` by the inventory `id`, matching Flux's documented inventory format.
- The Flux inventory cleanup command patched status without targeting the status subresource. Added `--subresource=status` so the command is aligned with kubectl's documented status subresource patching behavior.
- The RBAC prevention example showed a `ClusterRole` that granted `delete` on namespaces while describing namespace deletion prevention. Reworded the section to explain that Kubernetes RBAC is additive and does not support deny rules, and changed the example to a limited namespace read role.
- The Kyverno example used the deprecated `ClusterPolicy` API and the deprecated `spec.validationFailureAction` field. Replaced it with a current `policies.kyverno.io/v1` `ValidatingPolicy` example for Kyverno v1.18 and newer.

## Review Notes
The namespace finalizer recovery command is technically valid for force-removing namespace finalizers, but it should remain a last-resort recovery step because bypassing finalizers can leave external or dependent resources uncleaned. The post's Flux commands otherwise match current Flux CLI documentation.

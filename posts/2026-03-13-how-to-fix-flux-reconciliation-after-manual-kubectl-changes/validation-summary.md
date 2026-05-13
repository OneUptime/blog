# Validation Summary: How to Fix Flux Reconciliation After Manual kubectl Changes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Kustomization and kustomize-controller
- Kubernetes server-side apply and managed fields
- kubectl
- Kustomize
- Horizontal Pod Autoscaler
- Kyverno ClusterPolicy

## Sources Consulted
- Flux CLI reference: `flux diff kustomization` - https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux CLI reference: `flux reconcile kustomization` - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux FAQ: kubectl edits rolled back by Flux - https://fluxcd.io/flux/faq/
- Kubernetes `kubectl apply` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Server-Side Apply documentation - https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Horizontal Pod Autoscaling documentation - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kyverno validate rule documentation - https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The post used `flux reconcile kustomization my-app --with-source --force`, but the current Flux CLI reference for `flux reconcile kustomization` only documents `--with-source`; there is no `--force` option. Removed the unsupported flag.
- The post described Flux Kustomization `spec.force` as a way to overwrite field manager conflicts. Flux documents `spec.force` as replacing resources when patching fails due to immutable field changes. Updated the explanation and inline comment accordingly.
- The post suggested temporarily setting `force: true` to let Flux claim server-side apply fields. Replaced that guidance with Kubernetes server-side apply ownership transfer using `kubectl apply --server-side --force-conflicts`, plus Flux's documented `kustomize.toolkit.fluxcd.io/ssa: Merge` option for preserving non-overlapping fields.
- The Kyverno example used the deprecated top-level `spec.validationFailureAction` field and an empty `deny: {}` block. Updated it to current `validate.failureAction: Enforce`, added `background: false` because the rule uses admission request user information, and supplied explicit deny conditions for create, update, and delete operations.

## Review Notes
The Flux and Kubernetes commands are version-sensitive, especially around server-side apply behavior and field manager names. The remaining examples are technically plausible, but production policy enforcement should usually include tighter resource kind and subject exclusions to avoid blocking legitimate controllers beyond Flux.

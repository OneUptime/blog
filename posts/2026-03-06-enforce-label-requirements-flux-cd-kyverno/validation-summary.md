# Validation Summary: How to Enforce Label Requirements with Flux CD and Kyverno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes labels, Deployments, StatefulSets, DaemonSets, Services, and Namespaces
- Kyverno ClusterPolicy validation and mutation rules
- Kyverno JMESPath variables, API call context, and PolicyReports
- Flux CD Kustomization resources
- kubectl

## Sources Consulted
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Mutate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno Policy Settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno External Data Sources documentation: https://kyverno.io/docs/policy-types/cluster-policy/external-data-sources/
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno Policy Reports guide: https://kyverno.io/docs/guides/reports/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Recommended Labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The Kyverno examples used top-level `spec.validationFailureAction`, which Kyverno marks as deprecated as of 1.13. I moved enforcement to `validate.failureAction: Enforce` in each validation rule, matching the current documented placement.
- The cost-center mutation said it inherited the label from the namespace but used `{{request.namespace}}`, which copies the namespace name instead of the namespace's `cost-center` label. I added a rule context API call to `/api/v1/namespaces/{{request.namespace}}` and set the default label from `metadata.labels."cost-center"`.
- Some Kyverno variable substitutions referenced optional labels directly. Missing labels can cause JMESPath substitution errors, so I added `|| ''` defaults in messages and pod-template label propagation.
- The policy report command used `kubectl get policyreports -A`. Kubernetes plural aliases commonly work, but Kyverno's documentation uses `kubectl get policyreport -A`, so I updated the command to the documented resource form.

## Review Notes
Kyverno v1.18 documentation now presents CEL-based `ValidatingPolicy` and `MutatingPolicy` as stable and lists `ClusterPolicy` under deprecated policy types. The corrected post keeps the existing ClusterPolicy-based tutorial structure, but a future update should consider migrating the examples to the newer `policies.kyverno.io/v1` policy kinds.

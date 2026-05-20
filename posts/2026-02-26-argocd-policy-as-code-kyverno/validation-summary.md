# Validation Summary: How to Implement Policy-As-Code with ArgoCD and Kyverno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kyverno
- Kyverno CLI
- OPA Gatekeeper
- Policy-as-code

## Sources Consulted
- Kyverno validation rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutation rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno installation and configuration documentation: https://kyverno.io/docs/installation/installation/ and https://kyverno.io/docs/installation/customization/
- Kyverno PolicyException documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno CLI `apply` reference: https://main.kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno policy reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno Helm chart repository index and chart values for `kyverno-3.8.1`: https://kyverno.github.io/kyverno/index.yaml
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- OPA Gatekeeper mutation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/

## Issues Found
- The post said OPA Gatekeeper does not natively handle mutation. Current Gatekeeper documentation lists mutation as stable, so the comparison was revised to avoid that inaccurate claim while preserving the Kyverno-focused point.
- The Kyverno Helm example used old chart values such as top-level `replicaCount` and a list-shaped `config.webhooks`. Updated the example to chart `3.8.1` values, controller-specific `replicas`, current `config.webhooks.namespaceSelector`, and PolicyException feature enablement.
- The validation policy used deprecated `spec.validationFailureAction`. Moved the setting to `validate.failureAction`, matching current Kyverno guidance.
- The Argo CD `ignoreDifferences` example ignored only `deployed-at` on Deployments even though the mutation adds `managed-by` and `deployed-at` to Deployments, Services, and ConfigMaps. Expanded the ignore rules to match the mutation example.
- The sync wave explanation implied ordering across standalone Applications. Clarified that the ordering applies when the Applications are managed by the same parent Application.
- The PolicyException example used `kyverno.io/v2beta1`. Updated it to the current `kyverno.io/v2` API.
- The Kyverno CLI example used a non-existent `--audit` flag. Replaced it with the documented `--audit-warn` flag.
- The gradual rollout text referenced deprecated `validationFailureAction`. Updated it to `validate.failureAction`.

## Review Notes
The post still uses Kyverno `ClusterPolicy` examples because they remain documented and supported, but Kyverno's current documentation marks the ClusterPolicy policy type as deprecated in favor of newer CEL-based policy types. A future rewrite should consider migrating the examples to `ValidatingPolicy`, `MutatingPolicy`, and `GeneratingPolicy`.

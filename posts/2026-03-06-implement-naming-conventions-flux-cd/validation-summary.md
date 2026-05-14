# Validation Summary: How to Implement Naming Conventions with Flux CD

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes
- Flux CD
- Kustomize
- Kyverno
- GitOps

## Sources Consulted
- Kubernetes Object Names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno regex validation sample policy: https://kyverno.io/policies/other/metadata-match-regex/metadata-match-regex/
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/

## Issues Found
- The Kyverno examples used `spec.validationFailureAction`, which Kyverno documents as deprecated. Moved enforcement to `validate.failureAction: Enforce` in each validation rule.
- The deployment, namespace, and service policies used Kyverno wildcard patterns such as `?*-?*` while describing regex-style validation. Replaced those placeholder patterns with `deny` conditions using `regex_match()` so the policies actually enforce lowercase, hyphenated names and environment constraints.
- The service selector policy only checked that `app.kubernetes.io/name` existed. Updated it to compare the selector value to the Service name, matching the text of the example.
- The Kustomize examples used `commonLabels`, which modern Kustomize warns is deprecated in favor of `labels`. Updated the snippets to use `labels[].pairs` with `includeSelectors: true`.
- The Namespace exclusion used namespace filtering for a cluster-scoped Namespace object. Updated it to exclude by resource `names`, which is the Kyverno selector field intended for object names.

## Review Notes
The Kubernetes naming guidance is intentionally conservative at 63 characters for common workload and Service names. Kubernetes also has resource types that use DNS subdomain names up to 253 characters, so teams should tune the standard if they apply it to resource kinds outside the examples shown.

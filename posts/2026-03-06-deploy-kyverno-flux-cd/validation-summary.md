# Validation Summary: How to Deploy Kyverno with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno
- Flux CD
- Kubernetes
- Helm and Flux HelmRelease
- Kustomize and Flux Kustomization
- Kubernetes NetworkPolicy
- Kyverno PolicyReport and PolicyException resources

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno releases and Kubernetes compatibility: https://kyverno.io/docs/installation/releases/
- Kyverno configuration documentation: https://kyverno.io/docs/installation/customization/
- Kyverno ClusterPolicy validation rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno Policy Exceptions guide: https://kyverno.io/docs/guides/exceptions/
- Kyverno official Helm chart values: https://github.com/kyverno/kyverno/blob/main/charts/kyverno/values.yaml
- Kyverno Helm repository index: https://kyverno.github.io/kyverno/index.yaml
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The prerequisite Kubernetes version and Kyverno Helm chart version were stale. Updated the prerequisite to match Kyverno v1.18 support and changed the chart constraint from `3.3.x` to `3.8.x`.
- The Helm values placed `webhookTimeout` under `config`, which is not a valid Kyverno chart value. Moved it to `admissionController.container.extraArgs.webhookTimeout`.
- The validation policies used top-level `spec.validationFailureAction`, which Kyverno marks deprecated. Moved audit behavior to `spec.rules[*].validate.failureAction`.
- The mutation policy comment said it applied in background to existing resources while `background: false` only mutates admission requests. Corrected the comment.
- The generated NetworkPolicy comment said all egress was denied even though DNS egress was allowed. Updated the comment to reflect the actual policy.
- The container security policy claimed to enforce read-only root filesystems but had no such rule. Removed that claim and aligned the security-context patterns with Kyverno's optional-anchor style for init and ephemeral containers.
- The verification command tested a Pod even though the label validation policy targets Deployments and StatefulSets. Changed it to a server-side dry run for a Deployment.

## Review Notes
Kyverno v1.18 documentation marks the older `ClusterPolicy` policy family as deprecated while still documenting and supporting it. A future modernization pass should consider rewriting the policy examples with the stable CEL-based `ValidatingPolicy`, `MutatingPolicy`, and `GeneratingPolicy` APIs.

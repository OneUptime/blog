# Validation Summary: How to Enforce Image Pull Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes image pull policies
- Argo CD and AppProject configuration
- Argo CD Image Updater
- Kyverno ClusterPolicy mutate, validate, generate, and verifyImages rules
- OPA Gatekeeper ConstraintTemplate and Constraint resources
- Cosign image signature verification

## Sources Consulted
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kyverno mutate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno Disallow Latest Tag policy: https://kyverno.io/policies/best-practices/disallow-latest-tag/disallow-latest-tag/
- Kyverno Verify Image policy: https://kyverno.io/policies/other/verify-image/verify-image/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/

## Issues Found
- The introduction described `IfNotPresent` as the default without qualification. Kubernetes defaults to `Always` for omitted or `:latest` tags and `IfNotPresent` for explicit non-`latest` tags, so the wording was corrected.
- The Kyverno validation snippets used top-level `validationFailureAction` for regular validate rules. Current Kyverno validate documentation shows rule-level `failureAction`, so those examples were updated.
- The Kyverno latest-tag pattern used an overly broad expression that would also reject image names containing `latest` outside the actual tag. It was replaced with the official-style `!*:latest` pattern using `foreach` for containers and init containers.
- The digest enforcement snippet only checked regular containers. It now uses `foreach` for containers and init containers so the policy matches the text more accurately.
- The Argo CD AppProject section claimed projects can restrict container registries. AppProjects restrict source repositories, destinations, and Kubernetes resource kinds, not container image registries, so the section text and inline comment were corrected.
- The image pull secret section said Argo CD can manage secrets across namespaces. The example is a Kyverno generate policy synced by Argo CD, so the wording was corrected.
- The monitoring section claimed the custom health check monitors pull policy compliance. The Lua snippet only checks Kyverno ClusterPolicy readiness, so the heading and description were corrected.

## Review Notes
Kyverno's current documentation marks legacy ClusterPolicy pages as deprecated in favor of newer policy types, but the official policy library still publishes ClusterPolicy examples for mutate, generate, and verifyImages use cases. The post remains technically valid for clusters using Kyverno ClusterPolicy resources, but a future update could migrate examples to newer Kyverno policy APIs where feature parity is available.

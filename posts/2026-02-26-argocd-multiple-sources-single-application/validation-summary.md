# Validation Summary: How to Use Multiple Sources for a Single ArgoCD Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source configuration
- Kubernetes manifests
- Helm charts and values files
- GitOps workflows
- ApplicationSet

## Sources Consulted
- Argo CD official documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD official documentation: Application Specification Reference - https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD official documentation: Helm - https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD official documentation: Parameter Overrides - https://argo-cd.readthedocs.io/en/stable/user-guide/parameters/
- Argo CD official documentation: argocd app get command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official documentation: argocd app manifests command reference - https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD official documentation: argocd app diff command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/

## Issues Found
- The post said `source` and `sources` cannot both be used in the same Application. Argo CD documentation says that when `sources` is specified, Argo CD ignores the singular `source` field. Updated the wording to match the documented behavior.
- The `ref` rules included an unsupported identifier-format claim. Replaced it with the documented rule that the `$ref` variable can only appear at the beginning of a Helm value file path.
- The duplicate-resource behavior was described as a detected conflict with unpredictable behavior. Argo CD documentation says the last source takes precedence, Argo CD emits `RepeatedResourceWarning`, and it still syncs the resource. Updated the limitation text accordingly.
- The CLI limitation note was too broad. Current Argo CD CLI documentation includes source position and source name support for some multi-source operations. Updated the note to reflect current CLI support while preserving the recommendation to define sources declaratively.

## Review Notes
The examples use current Argo CD Application fields such as `spec.sources`, `helm.valuesObject`, `helm.valueFiles`, `ref`, `releaseName`, automated sync policy, and `CreateNamespace=true`. The post correctly warns that multi-source Applications should not be used as a generic grouping mechanism for unrelated applications.

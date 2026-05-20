# Validation Summary: How to Deploy Kustomize Applications with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kustomize
- GitOps
- External Secrets Operator
- Kubernetes YAML manifests

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD tool detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD CLI command reference for `argocd app get` and `argocd app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/main/api/externalsecret/

## Issues Found
- The explicit Argo CD tool selection example used `source.directory`, which explicitly selects the plain directory tool rather than Kustomize. Changed it to `source.kustomize: {}`.
- The Kustomize examples used `commonLabels`, which current Kustomize emits deprecation warnings for. Updated the examples to use the current `labels` list form with `pairs` and `includeSelectors: true`.
- The dev Application example omitted `spec.project`. Added `project: default` to match the Argo CD Application spec pattern used elsewhere in the post.
- The build options section said Application-level Kustomize settings pass flags to `kustomize build`, and the inline comment implied `--enable-helm` could be set there. Updated the wording to describe Application-level Kustomize parameters and kept `--enable-helm` in the global `argocd-cm` build options example.
- The global build options example included `--enable-alpha-plugins` without a plugin use case. Simplified it to the documented `--enable-helm` example for Helm chart inflation through Kustomize.
- The External Secrets example used `external-secrets.io/v1beta1`. Updated it to `external-secrets.io/v1`, matching the current External Secrets Operator documentation.
- The namespace warning implied the generic Application destination namespace was equivalent to Kustomize namespace transformation. Clarified that `spec.destination.namespace` only fills missing namespaces and that `spec.source.kustomize.namespace` or the overlay `namespace` field should be used when Kustomize should set namespace fields.
- The generator hash suffix warning incorrectly said Argo CD detects changes on every sync when content has not changed. Reworded it to state that Kustomize generates new resource names when generator content changes, and that disabling the suffix is for predictable names.

## Review Notes
Local `kubectl` and `kustomize` binaries were not installed in the review environment, so CLI behavior was verified against official command references instead of local `--help` output.

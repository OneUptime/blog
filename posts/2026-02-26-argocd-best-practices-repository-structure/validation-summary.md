# Validation Summary: ArgoCD Best Practices for Repository Structure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes manifests
- Kustomize
- Helm
- Argo CD Application, AppProject, and ApplicationSet organization
- GitHub Actions-style CI workflow snippets

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Best Practices documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The Kustomize-based Argo CD `Application` example omitted `spec.project`. Added `project: default` to align with Argo CD's minimal declarative Application examples.
- The Helm-based Argo CD `Application` example omitted both `metadata.namespace` and `spec.project`. Added `namespace: argocd` and `project: default` so the manifest is complete as a standalone Argo CD Application resource.
- The `AppProject` example omitted `metadata.namespace`. Added `namespace: argocd`, matching Argo CD's guidance that `Application` and `AppProject` resources are installed in the Argo CD namespace by default.

## Review Notes
- The repository-structure guidance is presented as best practice rather than a single required architecture. Argo CD supports several valid repository layouts, including mono-repo, multi-repo, app-of-apps, and ApplicationSet-generated applications.
- The Helm example uses a Git-hosted chart path with `helm.valueFiles`, which is valid. For charts pulled directly from a Helm repository, Argo CD uses `spec.source.chart` instead of `spec.source.path`.

# Validation Summary: How to Create ArgoCD Projects for Team Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects
- Argo CD Applications
- Argo CD CLI
- Kubernetes manifests
- Kustomize
- GitOps
- Kubernetes RBAC resource kinds

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_create/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- The `resources-finalizer.argocd.argoproj.io` comment said it prevents accidental deletion. Argo CD documents this finalizer as preventing project deletion while applications still reference the project, so the comment was updated to describe that behavior accurately.
- The `argocd-projects` Application uses `project: platform` and deploys into the `argocd` namespace, but the earlier `platform` AppProject destination allow list did not include `argocd`. Added the `argocd` namespace to the platform project destinations so the example is internally consistent and allowed by the project constraints.

## Review Notes
- The Argo CD CLI examples use current documented flags for project and application creation.
- The AppProject fields used in the YAML examples are current and match the official project specification.
- The external OneUptime link returned HTTP 200 during review.

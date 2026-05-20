# Validation Summary: How to Structure Kustomize Repos for ArgoCD Multi-Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- GitOps repository structure
- Kubernetes manifests
- Kustomize bases, overlays, and components

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- Fixed incorrect relative path comments in the environment-first Kustomize layout. From `environments/dev/frontend`, the shared base is reached with `../../../bases/frontend`, not `../../bases/frontend`.
- Fixed incorrect relative path comments in the shared base examples. From `apps/frontend/base`, the shared base is reached with `../../../shared/bases/web-app`, not `../../shared/bases/web-app`.
- Added `project: default` to the Argo CD parent Application example, matching Argo CD's documented minimal Application spec.
- Updated the ApplicationSet example to use Go template syntax with `goTemplate: true` and `goTemplateOptions: ["missingkey=error"]`, because Argo CD documents Go templates as the stronger current option and notes the older fasttemplate mode is expected to be deprecated.
- Corrected the ApplicationSet path variables. For `apps/*/overlays/production`, the app name is `{{index .path.segments 1}}`, the environment is `{{.path.basename}}`, and the source path is `{{.path.path}}`.
- Added `project: default` to the ApplicationSet template so generated Applications include the required project association shown in Argo CD examples.

## Review Notes
The repository layout recommendations are generally conventional rather than mandated by Argo CD or Kustomize. The guidance to keep Kubernetes manifests in a separate repository is a valid operational recommendation, but teams may still choose a monorepo when their access-control and review model supports it.

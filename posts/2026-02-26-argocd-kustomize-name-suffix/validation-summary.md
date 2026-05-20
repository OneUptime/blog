# Validation Summary: How to Override Kustomize Name Suffix in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kustomize
- GitOps
- Argo CD CLI

## Sources Consulted
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Argo CD CLI examples used `--kustomize-name-suffix`, which is not the documented flag for `argocd app set` or `argocd app create`. Changed both examples to `--namesuffix`, matching the official command reference.
- The version-based and canary examples implied that suffixing resource names alone isolates Service traffic. Kustomize name suffixes rename resources and known name references, but they do not automatically create distinct app labels or Service selectors. Added concise caveats that same-namespace parallel deployments need distinct labels and Service selectors.

## Review Notes
The core `spec.source.kustomize.nameSuffix` field, Kustomize `nameSuffix` behavior, Argo CD override precedence, `--source git` usage for `argocd app manifests`, and cascade deletion examples are consistent with the consulted documentation.

# Validation Summary: How to Use Git Submodules with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Git submodules
- Kubernetes
- Kustomize
- Helm
- kubectl

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl set env documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Git submodule documentation: https://git-scm.com/docs/git-submodule

## Issues Found
- The post incorrectly stated that Argo CD disables Git submodule checkout by default and must be explicitly enabled. Current Argo CD documentation says submodules are supported and picked up automatically, and `ARGOCD_GIT_MODULES_ENABLED=false` is used to disable support. Updated the introduction and submodule configuration section accordingly.
- The post showed `resource.customizations.ignoreDifferences.all` as a possible submodule setting. That setting controls diff customization, not Git submodule checkout. Updated the surrounding text and comment to make this clear.
- The post used `ARGOCD_GIT_MODULES_ENABLED=true` and a JSON patch command as the enablement path. Since submodules are already enabled by default, changed the example to show disabling submodules with `kubectl set env ... ARGOCD_GIT_MODULES_ENABLED=false`.
- The post claimed submodules can be enabled per repository with an `enableSubmodules` repository Secret field. This field is not documented as a repository Secret option in current Argo CD docs. Removed the example.
- The authentication section implied independently registering credentials for parent and submodule repositories was sufficient. Argo CD documentation states authenticated submodules need credentials that match the parent repository, so the examples now use credential templates whose URL prefixes and credentials can match both repositories.
- The final "ArgoCD documentation on multi-source applications" link pointed to a OneUptime blog URL instead of the official Argo CD documentation. Updated it to the official Argo CD Multiple Sources page.

## Review Notes
The remaining Kustomize and Argo CD Application examples are syntactically consistent with the referenced documentation. The post does not pin an Argo CD version, so the review used current stable/latest Argo CD documentation as of 2026-05-20.

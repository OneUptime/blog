# Validation Summary: How to Create an ArgoCD Application Using the UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Helm
- Kustomize

## Sources Consulted
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Creating Apps Via UI documentation: https://argo-cd.readthedocs.io/en/release-2.2/getting_started/#creating-apps-via-ui
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/release-2.2/user-guide/tool_detection/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes managing Secrets with kubectl documentation: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/

## Issues Found
- The sync dialog described **Force** as "Skip safety checks." Argo CD documents force sync as using delete/create behavior for selected resources, which can be destructive and can cause outages. Updated the description to: "Delete and recreate selected resources during sync (use with caution)."

## Review Notes
- The port-forward command, initial admin password retrieval, UI application creation flow, default `HEAD` revision, in-cluster destination URL, sync policy descriptions, sync options, tool detection for Helm/Kustomize/directory apps, and ignore-differences example are consistent with official documentation.
- The post uses "ArgoCD" as a spelling convention, while the project documentation generally uses "Argo CD"; this is a naming/style issue, not a technical correctness issue.

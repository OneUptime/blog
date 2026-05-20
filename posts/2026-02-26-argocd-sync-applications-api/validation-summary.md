# Validation Summary: How to Sync Applications via ArgoCD API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD REST API
- Kubernetes
- GitOps
- Bash
- curl
- jq
- GitHub Actions

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Application API protobuf definition: https://github.com/argoproj/argo-cd/blob/master/server/application/application.proto
- Argo CD Application API types: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- Argo CD Sync Applications with Kubectl documentation: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/sync-kubectl/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD terminate operation command documentation: https://argo-cd.readthedocs.io/en/release-2.1/user-guide/commands/argocd_app_terminate-op/
- GitOps Engine operation phase constants: https://github.com/argoproj/gitops-engine/blob/master/pkg/sync/common/types.go

## Issues Found
- The post said the sync endpoint returns the sync operation result. The official API definition shows `POST /api/v1/applications/{name}/sync` returns an Application object, so the wording was changed to say it returns the updated Application object including operation state.
- The strategy section implied Apply was the default. Official Argo CD documentation states Hook is the default strategy and Apply is the explicit `kubectl apply` strategy, so the wording and comments were corrected.
- The force example said it deletes and recreates resources instead of patching. Official Argo CD documentation for apply/hook strategies says `force` deletes the resource when patching conflicts after retries, so the comment was corrected.
- The wait script required the application health status to be `Healthy` before reporting sync completion. Operation completion is represented by the terminal operation phase (`Succeeded`, `Failed`, or `Error`), so the script now exits successfully when the operation phase is `Succeeded` and reports the current health separately.

## Review Notes
The API examples use `-k` to skip TLS verification for brevity. This is technically valid for curl, but production automation should use trusted certificates rather than disabling verification.

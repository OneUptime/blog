# Validation Summary: How to Use ArgoCD REST API: Complete CRUD Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD REST API
- Argo CD CLI
- GitOps
- Kubernetes
- curl
- jq
- Bash

## Sources Consulted
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD OpenAPI/Swagger specification: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Argo CD local users/accounts documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd app patch` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_patch/

## Issues Found
- The application PATCH example sent the merge patch document directly with `Content-Type: application/merge-patch+json`. Argo CD's `ApplicationService_Patch` REST endpoint expects a JSON request containing `patchType` and a string-valued `patch`, so the example was updated to match the official OpenAPI schema.
- The SSH repository creation example interpolated `cat ~/.ssh/argocd_deploy_key` directly into a JSON string. PEM private keys contain newlines, which can produce invalid JSON. The example now uses `jq -n --arg` to encode the key safely.
- The post described the examples as complete coverage of every major CRUD operation and implied every UI/CLI operation is available through the API. The wording was narrowed to "common operations" and "most operations" to avoid overstating the documented examples.
- The production automation note referred generically to service accounts. It now uses Argo CD's documented terminology: dedicated local accounts or project role tokens with limited RBAC permissions.
- The session login example omitted `Content-Type: application/json`. Argo CD's API documentation shows JSON content for `/api/v1/session`, so the header was added.

## Review Notes
- The remaining endpoint paths, request bodies, and query parameters used in the post match the current Argo CD OpenAPI specification for applications, sync operations, repositories, clusters, projects, resource trees, and managed resources.
- The examples use `-k` for curl, which is acceptable for illustrative internal examples but should be avoided in production when proper TLS trust is configured.

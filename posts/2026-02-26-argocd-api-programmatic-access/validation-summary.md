# Validation Summary: How to Access ArgoCD API Programmatically

## Status
validated

## Post Type
Tutorial / API integration guide

## Technologies Covered
- Argo CD REST API
- Argo CD gRPC API
- Argo CD CLI
- Kubernetes Application manifests
- curl
- Python requests
- GitHub Actions
- jq

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Projects and Project Roles docs: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_create-token/
- Argo CD `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_proj_role_add-policy/
- Argo CD generated application REST gateway source: https://github.com/argoproj/argo-cd/blob/master/pkg/apiclient/application/application.pb.gw.go
- Argo CD generated application API types source: https://github.com/argoproj/argo-cd/blob/master/pkg/apiclient/application/application.pb.go
- Argo CD generated session REST gateway source: https://github.com/argoproj/argo-cd/blob/master/pkg/apiclient/session/session.pb.gw.go

## Issues Found
- The introduction said the guide included Go examples, but the post only includes curl, Python, and GitHub Actions examples. Changed the sentence to say "curl and Python" so it accurately describes the post.
- The session-token curl example posted JSON to `/api/v1/session` without a `Content-Type: application/json` header. Argo CD's official API docs include that header for the session endpoint, so the example now includes it.

## Review Notes
- The API endpoint paths for listing, creating, syncing, deleting, and rolling back applications match Argo CD's generated REST gateway routes.
- The application create request correctly sends the Application object as the request body, and the sync and rollback examples use fields present in Argo CD's generated request types.
- The project token and account token commands use current documented flags, including `--expires-in`.
- For project role policies, future revisions could mention that application RBAC objects are project-scoped and may be represented as `<project>/<application>` in policy rules.

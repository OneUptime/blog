# Validation Summary: How to Create Applications via ArgoCD API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD REST API
- Argo CD Application spec
- Kubernetes
- Helm
- Kustomize
- Bash, curl, and jq
- Python requests

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD app create command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD Swagger specification: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Python requests API documentation: https://requests.readthedocs.io/en/latest/api/

## Issues Found
- The validation section described `POST /api/v1/applications?validate=true` as a dry-run validation before creating the application. The official API exposes `validate` as a create-time validation option, and the CLI describes validation as repository and cluster validation, not as dry-run behavior. Changed the section to "Validating During Creation" and clarified that the request still creates the application with validation enabled.
- The duplicate-application handling text said to use PATCH, but the example uses a full-application PUT update. Changed the message to say PUT replacement.
- The Python example used an undefined `token` variable and imported `json` without using it. Replaced the unused import with `os` and loaded `token` from `ARGOCD_TOKEN` so the snippet is runnable when the environment variable is set.

## Review Notes
- The examples use `-k` and `verify=False`, which are common for quick examples against self-signed Argo CD endpoints but should be replaced with proper certificate verification in production.
- The inline Helm values include a placeholder password. In production, credentials should come from a secret-management workflow rather than static values in source-controlled configuration.

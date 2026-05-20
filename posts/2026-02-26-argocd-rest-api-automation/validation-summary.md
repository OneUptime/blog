# Validation Summary: How to Use ArgoCD REST API for Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD REST API
- Argo CD CLI
- Kubernetes
- GitOps
- Bash and curl
- Python requests
- JSON Web Tokens
- RBAC / project-scoped tokens

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Swagger schema: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Argo CD Architecture Overview: https://argo-cd.readthedocs.io/en/latest/operator-manual/architecture/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD Projects / Project Roles documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/projects/

## Issues Found
- The session creation curl examples sent JSON without an explicit `Content-Type: application/json` header. Added the header to match the official API documentation and avoid servers treating the payload as form data.
- The project token API example called `POST /api/v1/projects/{project}/roles/{role}/token` without the required JSON request body. Added `Content-Type: application/json` and a valid `expiresIn` body.
- The deployment script used the application `PATCH` endpoint with a raw partial Application object. The Argo CD Swagger schema requires an `ApplicationPatchRequest` wrapper with `patch` and `patchType` fields, so the script now sends a merge patch request in the expected format.
- The Python polling loop did not call `raise_for_status()` on the application status response, so HTTP errors could be mistaken for JSON parsing or missing-key failures. Added status checking before reading the response body.
- The post claimed the Applications API supports pagination using `limit=50`. The current Argo CD REST schema does not expose `limit` or `continue` parameters for `GET /api/v1/applications`. Replaced the section with API filtering examples using supported `selector` and `project` query parameters.

## Review Notes
- The API endpoint paths, bearer token authentication flow, application create/delete/sync examples, resource query parameters, CLI project-token command, and architecture explanation were consistent with official Argo CD documentation and Swagger schema after the fixes above.
- The examples use `curl -k` and `verify_ssl=False` for local or demo environments. The post correctly advises verifying TLS certificates in production.

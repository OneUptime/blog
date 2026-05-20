# Validation Summary: How to List Applications via ArgoCD API

## Status
validated

## Post Type
Tutorial / API guide

## Technologies Covered
- Argo CD REST API
- Kubernetes label selectors
- curl
- jq
- Python requests

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD generated Swagger: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Argo CD Application API proto: https://raw.githubusercontent.com/argoproj/argo-cd/master/server/application/application.proto
- Argo CD Application API implementation: https://raw.githubusercontent.com/argoproj/argo-cd/master/server/application/application.go
- Argo CD application filtering helpers: https://raw.githubusercontent.com/argoproj/argo-cd/master/util/argo/argo.go
- Argo CD Application type definitions: https://raw.githubusercontent.com/argoproj/argo-cd/master/pkg/apis/application/v1alpha1/types.go
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/

## Issues Found
- The post used `search=frontend` and described it as a substring name search. Argo CD's applications list API does not expose a `search` query parameter; it exposes `name`, which is an exact-name filter. Updated the section and example accordingly.
- The post described a `fields` query parameter for limiting the response. The current generated Swagger for `/api/v1/applications` does not list `fields`; replaced the example with client-side `jq` field projection.
- The examples used the legacy `project` query parameter. The current Swagger exposes `projects` as the primary repeated project filter and `project` only as a legacy compatibility name. Updated examples and the Python client to send `projects`.
- The Python example referenced `token` without defining it. Added `os.environ["ARGOCD_TOKEN"]` so the snippet is runnable as shown.
- The conclusion referenced "field selection" as though it were an API feature. Updated it to "client-side field projection."

## Review Notes
The remaining API examples align with the current Argo CD ApplicationQuery fields: `selector`, `repo`, `appNamespace`, `name`, and repeated `projects`. The examples still use `curl -k` and `verify=False`, which are functional for test environments but should be avoided in production unless certificate verification is handled separately.

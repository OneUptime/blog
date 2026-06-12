# Validation Summary: How to Implement OPA for API Authorization

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego
- OPA REST Data API and Compile API
- OPA decision logging and CLI
- Kubernetes Deployments, sidecars, ConfigMaps, and volumes
- Node.js with Axios
- Python FastAPI with HTTPX
- node-cache

## Sources Consulted
- Open Policy Agent REST API Reference: https://www.openpolicyagent.org/docs/rest-api
- Open Policy Agent Policy Language: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent Decision Logs: https://www.openpolicyagent.org/docs/management-decision-logs
- Open Policy Agent CLI Reference: https://www.openpolicyagent.org/docs/cli
- Open Policy Agent HTTP API Authorization guide: https://www.openpolicyagent.org/docs/http-api-authorization.html
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap volume documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Axios request config documentation: https://axios-http.com/docs/req_config
- FastAPI error handling documentation: https://fastapi.tiangolo.com/tutorial/handling-errors/
- HTTPX API documentation: https://www.python-httpx.org/api/
- node-cache README: https://github.com/node-cache/node-cache

## Issues Found
- The OPA Compile API example set `"unknowns": ["input.user"]` while the policy also depends on `input.action` and `input.resource`. With no request input supplied, OPA treats those omitted values as known undefined, so partial evaluation produces no useful query for the authorization policy. Changed the example to `"unknowns": ["input"]`, matching OPA's documented default and preserving the full request input as unknown during partial evaluation.

## Review Notes
- Rego policy snippets and unit tests were checked with `openpolicyagent/opa:latest`, which reported OPA 1.16.2 and Rego v1. The extracted basic policy tests passed.
- The OPA Data API request shape, decision log console configuration, `opa run --server --config-file`, Kubernetes Deployment/ConfigMap volume pattern, Axios timeout option, FastAPI `HTTPException`, and HTTPX async POST timeout usage align with the consulted documentation.
- For production deployments, pinning the OPA container image instead of using `openpolicyagent/opa:latest` would improve reproducibility, but the snippet is valid as a conceptual example.

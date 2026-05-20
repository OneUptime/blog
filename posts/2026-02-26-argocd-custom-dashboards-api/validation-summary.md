# Validation Summary: How to Build Custom Dashboards with ArgoCD API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD API
- Kubernetes GitOps application status
- Python
- Flask
- Requests
- Grafana JSON API data source
- Server-sent events

## Sources Consulted
- Argo CD API docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD OpenAPI spec: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Requests SSL certificate verification documentation: https://requests.readthedocs.io/en/latest/user/advanced/#ssl-cert-verification
- Grafana JSON API data source query editor documentation: https://grafana.github.io/grafana-json-datasource/query-editor/
- Grafana JSON API data source configuration documentation: https://grafana.github.io/grafana-json-datasource/configuration/
- gRPC-Gateway streaming response documentation: https://grpc-ecosystem.github.io/grpc-gateway/docs/mapping/custom_marshalers/

## Issues Found
- The resource-tree endpoint in the architecture diagram used `name` as a literal path segment. Changed it to `/api/v1/applications/{name}/resource-tree`, matching the Argo CD OpenAPI path parameter.
- The Python examples used `datetime.utcnow()`, which is deprecated as of Python 3.12. Replaced it with `datetime.now(timezone.utc)` and kept comparisons timezone-aware.
- The Flask dashboard was described as complete but depends on the earlier `DashboardData` class. Updated the wording so the dependency is explicit.
- The deployment-frequency snippet used `Counter`, `defaultdict`, and `requests` without local imports. Added imports inside the function so the snippet is copyable.
- The streaming example called Argo CD's stream endpoint "ArgoCD SSE". Adjusted the comment to "ArgoCD streaming API" because the endpoint is a streaming JSON response; the Flask route is what emits SSE to the browser.

## Review Notes
The examples still use `verify=False` for Requests calls. This is technically supported by Requests, but it disables TLS certificate verification and should be replaced with normal verification or a trusted CA bundle in production.

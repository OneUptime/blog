# Validation Summary: How to Create Custom Dashboards Using ArgoCD API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD REST API
- Argo CD streaming application watch API
- Argo CD Prometheus metrics
- Prometheus PromQL
- Grafana dashboard JSON
- Python requests
- curl and jq

## Sources Consulted
- Argo CD API docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Swagger/OpenAPI source: https://github.com/argoproj/argo-cd/blob/master/assets/swagger.json
- Argo CD metrics docs: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Prometheus histogram and PromQL docs: https://prometheus.io/docs/practices/histograms/
- Grafana dashboard JSON model docs: https://grafana.com/docs/grafana/latest/reference/dashboard/

## Issues Found
- The post described the real-time application watch endpoint as a WebSocket and as Server-Sent Events. Argo CD's Swagger describes `/api/v1/stream/applications` as a streaming watch endpoint that returns application change events, so the heading and wording were corrected to refer to the streaming API.
- The repo-server example used `argocd_repo_server_generate_manifest_seconds_*`, which is not listed in current Argo CD repo-server metrics. It was replaced with a query for the documented `argocd_git_request_duration_seconds` histogram.
- The deployment timeline function accepted an `hours` argument but did not use it. It now filters deployment history entries by the requested lookback window.
- The Python examples sliced revision values directly, which can fail when Argo CD returns a missing or null revision. The examples now guard those values before slicing.
- The jq deployment history example iterated `.status.history[]` directly, which can fail if the application has no history. It now defaults missing history to an empty array.

## Review Notes
- The API examples assume `AUTH_HEADER` contains an Argo CD bearer token header, which matches the official API authentication pattern.
- The Grafana dashboard JSON is intentionally minimal. A production import usually includes datasource UIDs, dashboard IDs, schema version, and refresh/time settings.

# Validation Summary: How to Monitor NeuVector Security Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (SUSE Security) - container security platform
- NeuVector REST API (v1)
- Kubernetes (kubectl)
- jq (JSON processor)
- Bash scripting

## Sources Consulted
- NeuVector controller Swagger/OpenAPI spec (apis.yaml v5.6.0): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector REST API and automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector console / Connect to Manager docs: https://open-docs.neuvector.com/configuration/console/
- NeuVector Kubernetes deployment docs: https://open-docs.neuvector.com/deploying/kubernetes/
- Cross-checked against existing NeuVector posts in the repo (e.g., `posts/2026-03-20-neuvector-export-security-events/README.md`, `posts/2026-03-20-neuvector-upgrade/README.md`) to confirm the controller-API URL convention.

## Issues Found

Several technical issues were found and fixed:

1. **Wrong API host/port** — All API calls used `https://neuvector-manager:8443`, but port 8443 serves the Manager Web UI, not the REST API. The NeuVector REST API runs on the controller at port 10443. Replaced every occurrence with `https://neuvector-svc-controller:10443`, matching the convention used elsewhere in this repo and the official docs.

2. **Step 2 — `/v1/system/summary` field names were fabricated** — The endpoint exists, but the jq selectors referenced `total_workloads`, `crit_security_event`, `groups`, and `policy_status`, none of which exist on the `RESTSystemSummaryData.summary` schema. Replaced with real fields: `running_pods`, `running_workloads`, `services`, `policy_rules`, `enforcers`, `disconnected_enforcers`, and `cvedb_version`.

3. **Step 3 — `/v1/event?type=security` path is wrong** — There is no `/v1/event` endpoint with a `type=security` query parameter. The actual security-events path is `/v1/log/security`, which returns top-level `threats`, `incidents`, and `violations` arrays. Updated the URL and adjusted the jq pipeline to flatten those arrays before grouping by `level`. Same fix applied to Step 8's report generator.

4. **Step 4 — `/v1/scan/workload?start=...` (list form) does not exist** — The spec only defines `GET /v1/scan/workload/{id}` (singular, requires an ID) and `POST /v1/scan/workloads/scan_report` (bulk). Replaced both calls with `POST /v1/scan/workloads/scan_report` and adjusted the jq expressions: dropped the fabricated `.total` and `critical` fields (the bulk report does not expose a `critical` count at the workload level — it returns `high`/`medium` summed counts), used `.display_name` and `.domain` (the actual workload-summary fields) instead of `.name`/`.namespace`. Same fix applied to Step 8.

5. **Step 5 — `/v1/network/statistics` does not exist** — This endpoint is fully fabricated, and so are the `.total`/`.ingress`/`.egress` response fields. Removed the bash code block. The dashboard navigation steps above it are accurate and stand on their own.

6. **Step 6 — `/v1/security/risk` does not exist** — Replaced with `/v1/system/score/metrics` (the real risk-score endpoint, which returns `RESTScoreMetricsData`). Simplified the jq to `'.'` rather than reference the previously fabricated nested fields, since the consumer should inspect the real shape.

7. **Step 7 — Wrong HTTP method on `/v1/response/rule`** — The spec only allows `GET`, `PATCH`, and `DELETE` on this path. To create a rule you `PATCH` with a body wrapper of `{"insert": {"rules": [...]}}`. Changed `POST` to `PATCH` and re-wrapped the rule body. The individual rule fields (`event`, `comment`, `conditions`, `actions`, `webhooks`, `disable`) are real and were preserved.

## Review Notes

- The dashboard navigation instructions (UI menu paths, filter options) were left intact. They could not be verified line-for-line against an authoritative UI reference, but they are consistent with the NeuVector Manager UI structure.
- The `kubectl get svc neuvector-service-webui -n neuvector` command and the default `admin/admin` credentials are correct.
- The `POST /v1/scan/workloads/scan_report` body is sent as `{}` (no filter) for simplicity; readers running this at scale may want to scope it via the request payload.
- The `/v1/log/security` response shape has multiple top-level arrays (`threats`, `incidents`, `violations`); the jq pipeline uses `?` to tolerate missing arrays in environments where one or more categories are empty.
- Authentication flow (`POST /v1/auth` to obtain a token, then `X-Auth-Token` header on subsequent requests) is implied by the `${TOKEN}` variable but not shown in this post — readers should refer to a sibling post (e.g., the export-security-events post) for the auth step. This is consistent with how other posts in the series are structured.

# Validation Summary: How to Export NeuVector Security Events

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (REST API, controller manager, vulnerability scanner, CIS benchmarks)
- Bash / curl / jq scripting
- Kubernetes CronJob (`batch/v1`)
- AWS S3 CLI

## Sources Consulted
- NeuVector official OpenAPI / Swagger spec: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- NeuVector REST API & Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector Reporting & Notifications docs: https://open-docs.neuvector.com/5.2/reporting/reporting/

## Issues Found
The post used several incorrect REST API endpoint paths that do not exist in NeuVector. Each was cross-checked against the upstream `apis.yaml` Swagger spec and corrected.

1. **Wrong event endpoint.** Original used `GET /v1/event`. NeuVector exposes events at `GET /v1/log/event` (returns `RESTEventsData` with an `events` array). Fixed in Step 1, Step 2, and the Step 6 CronJob.
2. **Wrong query parameter for filtering by category.** The original used `type=security`. The events struct uses a `category` field (e.g., `WORKLOAD`), so the parameter was changed to `category=security` to align with the schema.
3. **Wrong audit endpoint.** Original used `GET /v1/audit`. NeuVector exposes the audit log at `GET /v1/log/audit` (returns `RESTAuditsData` with an `audits` array). Fixed in Step 5.
4. **Audit log jq fields did not match the schema.** Original referenced `.action`, `.resource_name`, `.result`, and `.remote_ip`, none of which exist on the `Audit` definition. Replaced them with real fields (`name`, `level`, `host_name`, `workload_name`, `image`, `message`) and switched the timestamp to `reported_at` (ISO-8601 string) for readability.
5. **Wrong vulnerability endpoint and response shape.** Original used `GET /v1/scan/workload?start=0&limit=1000`, which is not a valid NeuVector route — `/v1/scan/workload/{id}` returns a single report (`RESTScanReportData`) and the bulk endpoint is `POST /v1/scan/workloads/scan_report`. Step 3 was rewritten to:
   - List workloads via `GET /v1/workload` and pull the per-workload `scan_summary` for the summary export.
   - Iterate workload IDs and call `GET /v1/scan/workload/{id}`, walking `.report.vulnerabilities[]` for the CSV export.
6. **Vulnerability summary fields did not exist.** Original mapped `.critical`, `.high`, `.medium`, `.low`, `.scanned_at` from a non-existent collection. The `RESTScanBrief` schema only exposes `high`, `medium`, `result`, `scanned_at`, etc. — `critical` and `low` are not present. Adjusted the jq projection accordingly.
7. **Wrong compliance endpoint.** Original used `GET /v1/bench/host` with a `.hosts[].items[]` jq filter. NeuVector exposes per-host benchmarks at `GET /v1/bench/host/{id}/kubernetes` (and `/docker`), and the response is a single `RESTBenchReport` with an `items` array. Step 4 was rewritten to first list hosts via `GET /v1/host` and then call the per-host kubernetes bench endpoint, producing the same CSV.
8. **Description / introduction / conclusion claimed coverage of syslog and webhooks** that the post did not actually include. Trimmed the description, intro, and conclusion so they accurately describe what the post covers (REST API + automation scripts).

## Review Notes
- The `start` / `limit` query parameters on `/v1/log/event` and `/v1/log/audit` are commonly accepted by NeuVector controllers but are not formally enumerated in the upstream Swagger; they were left in place since they have long been supported in practice. The Step 2 24-hour filter was switched to client-side filtering on `reported_timestamp` since `start_time` / `end_time` query parameters are not part of the documented API surface.
- `RESTScanBrief` only carries `high` and `medium` counts; consumers who need a full critical/high/medium/low/negligible breakdown must walk `.report.vulnerabilities[]` from `/v1/scan/workload/{id}` and bucket by `severity`. This is acceptable for the level of detail the post targets.
- The CronJob in Step 6 authenticates via `kubectl` `Secret` credentials but stores the bearer token only in memory of the running pod; for heavy use, an API key (long-lived token) issued under `/v1/api_key` would be a better choice but is out of scope for the post.
- The post implies severity strings like `High`/`Medium` from the `RESTVulnerability.severity` field, which matches the schema example values.

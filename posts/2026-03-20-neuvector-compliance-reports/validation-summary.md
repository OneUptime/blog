# Validation Summary: How to Generate NeuVector Compliance Reports

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector REST API (`/v1/auth`, `/v1/host`, `/v1/host/{id}/compliance`, `/v1/bench/host/{id}/docker`, `/v1/bench/host/{id}/kubernetes`, `/v1/workload`)
- Bash / POSIX shell scripting (compliance report generation)
- `curl` and `jq` for API automation
- Kubernetes `batch/v1` `CronJob` for scheduled report generation
- CIS Docker Benchmark and CIS Kubernetes Benchmark
- Compliance frameworks: PCI DSS, HIPAA, GDPR, NIST 800-190

## Sources Consulted
- NeuVector REST routes (`controller/rest/rest.go`) on GitHub `main` branch: https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go — verified the exact registered routes for `/v1/auth`, `/v1/host`, `/v1/host/:id`, `/v1/host/:id/compliance`, `/v1/workload`, `/v1/bench/host/:id/docker`, `/v1/bench/host/:id/kubernetes`, and `/v1/scan/workload/:id`. Confirmed there is no `/v1/bench/host` (collection) route and no `/v1/bench/host/all` route.
- NeuVector API types (`controller/api/apis.go`) on GitHub `main` branch: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go — verified `RESTHost`, `RESTHostsData` (uses `name`/`id` fields, exposes `docker_bench_status`/`kube_bench_status`), `RESTBenchCheck`/`RESTBenchItem`/`RESTBenchReport`, `RESTComplianceData`, and `RESTScanBrief` (`critical`, `high`, `medium`).
- NeuVector benchmark level constants (`share/clus_apis.go`) on GitHub `main` branch: https://github.com/neuvector/neuvector/blob/main/share/clus_apis.go — confirmed the canonical bench levels are `PASS`, `INFO`, `WARN`, `MANUAL`, `HIGH`, `NOTE`, `ERROR` (no `FAIL`), and `ComplianceTemplate*` constants use uppercase tag names (`PCI`, `GDPR`, `HIPAA`).
- NeuVector controller bench handlers (`controller/rest/bench.go`) on GitHub `main` branch: https://github.com/neuvector/neuvector/blob/main/controller/rest/bench.go — verified that `handlerHostCompliance` returns combined Custom + Docker + Kubernetes CIS items as `RESTComplianceData` with an `items` array.

## Issues Found

1. **Step 1 — non-existent endpoints `POST /v1/bench/host/all` and `GET /v1/bench/host`.**
   - Original code triggered scans against `POST /v1/bench/host/all` and read aggregated results from `GET /v1/bench/host`, neither of which is registered in NeuVector's REST routes. The actual endpoints are `POST /v1/bench/host/{id}/docker` and `POST /v1/bench/host/{id}/kubernetes`, and host status is read from `GET /v1/host` (`docker_bench_status` / `kube_bench_status` per host).
   - Fixed to first list hosts via `GET /v1/host`, then iterate host IDs, posting to the correct per-host bench endpoints. The status check now reads `docker_bench_status` and `kube_bench_status` from `GET /v1/host`.

2. **Step 1 — wrong response field names in the status query.**
   - Original referenced `.host`, `.status`, `.scanned_at` on `.hosts[]`, none of which exist on `RESTHost`. The struct exposes `.name`, `.id`, `.docker_bench_status`, `.kube_bench_status` (and `.scan_summary.scanned_at` for image scans, not bench).
   - Fixed to use `.name`, `.docker_bench_status`, `.kube_bench_status`.

3. **Step 3 — fictional aggregated bench response (`/v1/bench/host` returning `.hosts[]` with `.passed` / `.warned` / `.failed` / `.total`).**
   - Original `jq` summary expected per-host counters that NeuVector does not return. Per-host bench responses are `RESTBenchReport` with `items[]` only; counts must be derived from the `level` field on each item.
   - Fixed to iterate hosts via `/v1/host`, fetch `/v1/bench/host/{HOST_ID}/docker`, and compute Pass/Warn/Info/Manual counts in `jq` from `.items[]`. The `"=" * 60` / `"-" * 40` jq expressions (which jq does not support reliably for string-by-number repetition) were replaced with bash `printf '=%.0s' $(seq 1 60)` / `printf -- '-%.0s' $(seq 1 40)` outside the `jq` filter.

4. **Step 3 — wrong host identifier field in the detail loop.**
   - Original iterated with `.hosts[].host`; NeuVector uses `.name` (display) and `.id` (path parameter). The bench detail call also expected the same fictional `.host` value as the path segment.
   - Fixed to iterate `.hosts[].id` and look up `.name` from the cached host list, passing the ID to the bench endpoint and the name to the report text.

5. **Step 4 — same fictional `/v1/bench/host` collection endpoint and `level == "FAIL"` filter.**
   - NeuVector bench items never carry `level: "FAIL"`; the canonical level set is `PASS / INFO / WARN / MANUAL / HIGH / NOTE / ERROR`, and a failed CIS check is reported as `WARN`.
   - Fixed both CSV pipelines to iterate hosts via `/v1/host`, pull combined compliance via `/v1/host/{id}/compliance`, and filter failed checks with `select(.level == "WARN")`. CSV headers are now emitted via the same `{...}` block (instead of an awk wrapper) so the column count matches when no rows are produced.

6. **Step 5 — `select(.tags[]? == "pci")` uses the wrong case.**
   - Per `ComplianceTemplate*` constants in `share/clus_apis.go`, NeuVector compliance tag values are uppercase (`PCI`, `GDPR`, `HIPAA`). Lowercase `"pci"` would match nothing.
   - Fixed to `select(.tags[]? == "PCI")` and corrected the failure-level filter to `WARN`.

7. **Step 5 — non-existent `GET /v1/scan/workload?start=0&limit=1000`.**
   - The actual workload listing endpoint is `GET /v1/workload`, returning `RESTWorkloadsData` (`{"workloads": [...]}`). Per-workload CVE counts live on `scan_summary.{critical,high,medium}`, not on the workload root, and the listing has no `total` top-level field.
   - Fixed to call `GET /v1/workload`, count containers via `.workloads | length`, and filter critical/high CVE containers via `.workloads[] | select(.scan_summary.critical > 0)` and `select(.scan_summary.high > 0)`.

8. **Step 6 (CronJob) — same fictional endpoints and aggregate export.**
   - The cron template scanned via `POST /v1/bench/host/all` and exported `GET /v1/bench/host` to a single JSON file, neither of which works.
   - Fixed to fetch host IDs from `/v1/host`, run Docker + Kubernetes bench per host, then dump `/v1/host/{id}/compliance` per host into `/reports/${MONTH}/compliance-${HOST_ID}.json`.

9. **Step 7 — executive summary aggregated from non-existent fields.**
   - `[.hosts[].passed] | add` / `[.hosts[].failed] | add` cannot work because `RESTHost` has no `passed` / `failed` fields and `/v1/bench/host` does not exist.
   - Fixed to iterate hosts and aggregate Pass/Warn counts from each host's `/v1/host/{id}/compliance` items. Also added a divide-by-zero guard so the score computation does not call `bc` with a zero denominator when no checks have been completed.

## Review Notes

- Added a callout under Step 3 documenting the canonical NeuVector bench level set, since the original post conflated CIS Docker Bench's "FAIL" terminology with NeuVector's `WARN` level.
- The Step 6 CronJob references `${NV_USER}` / `${NV_PASSWORD}` without showing how they're injected; in practice these are typically populated via a Secret-backed `envFrom`/`env` block. Left as-is because adding the Secret wiring would expand scope beyond a technical fix.
- The `/v1/bench/host/{id}/docker` route invokes the cached report, so the read-back loop after `sleep 60` may still be empty if the Enforcer has not finished scanning. The `sleep 60` value is illustrative; production runs should poll `docker_bench_status == "finished"` before reading. Not changed because it matches the original tutorial style.
- UI navigation strings (`Security Risks > Compliance`, framework dropdown, namespace/node/severity filters, top-right Export) match the current NeuVector Manager UI conventions.
- Internal cluster service name `neuvector-svc-controller` on port `10443` (used by the CronJob) is the standard service exposed by the Helm chart for the Controller REST API; the manager-fronted `neuvector-manager:8443` used in the rest of the post is also valid for external access.

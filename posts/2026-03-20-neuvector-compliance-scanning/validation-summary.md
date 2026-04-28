# Validation Summary: How to Set Up NeuVector Compliance Scanning

## Status
validated

## Post Type
Tutorial / Guide — step-by-step walkthrough of NeuVector's compliance/bench REST APIs and UI for assessing hosts and containers against CIS Benchmarks and other regulatory frameworks.

## Technologies Covered
- NeuVector (Controller REST API, Manager UI, Enforcer bench scans)
- CIS Kubernetes / Docker Benchmarks
- Compliance frameworks: PCI DSS, HIPAA, GDPR, NIST 800-190
- Kubernetes (CronJob workloads, secrets)
- curl + jq for API calls and JSON parsing

## Sources Consulted
- NeuVector REST API and Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector Compliance docs: https://open-docs.neuvector.com/policy/compliance/
- NeuVector source — REST router definitions (`controller/rest/rest.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go
- NeuVector source — REST API types (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector source — bench/compliance handlers (`controller/rest/bench.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/bench.go
- NeuVector source — host handler (`controller/rest/host.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/host.go
- NeuVector source — Swagger spec (`controller/api/apis.yaml`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector source — bench level constants (`share/clus_apis.go`)

## Issues Found

1. **REST API host/port was wrong everywhere.** All examples called `https://neuvector-manager:8443/...`. Port 8443 is the Manager web console; the REST API is served by the Controller and listens on 10443. Replaced every URL with `https://neuvector-svc-controller:10443/...` and added a one-line note explaining the distinction.

2. **`POST /v1/bench/host/all` does not exist.** No such aggregate route is registered in the controller. Replaced with a host-id lookup via `GET /v1/host`, then per-host calls to the actual scan endpoints.

3. **`POST /v1/bench/host/{id}` is the wrong path.** The real routes are sub-pathed by tool: `POST /v1/bench/host/:id/docker` and `POST /v1/bench/host/:id/kubernetes`. Updated Step 1 to call both.

4. **`GET /v1/bench/host` (aggregated multi-host listing) does not exist.** The post claimed it returned `.hosts[]` with `host`, `passed`, `warned`, `failed`, `total` fields — these fields are fabricated and the route is not registered. Replaced Step 2 with `GET /v1/host` (returns `RESTHostsData.hosts`) for discovery, then `GET /v1/host/{id}/compliance` (returns `RESTComplianceData.items`) for the consolidated per-host report. Also kept `GET /v1/bench/host/{id}/docker` for the raw Docker CIS report since that route is real.

5. **`GET /v1/bench/workload/{id}` does not exist.** The workload-facing compliance route is `GET /v1/workload/{id}/compliance` (handlerContainerCompliance). Fixed in Step 3.

6. **Step 4 `category == "cis"` filter is invalid.** The valid `category` values per `controller/api/apis.go` are `"docker"`, `"kubernetes"`, and `"custom"` — there is no `"cis"` category. Switched the example to `"kubernetes"` and pointed the request at `/v1/host/{id}/compliance` (the new endpoint exposes all three categories in one report).

7. **Custom compliance check API was wrong on three counts.** Fixed in Step 6:
   - HTTP method was `POST`; only `GET` and `PATCH` are registered for `/v1/custom_check/:group`.
   - Path was `/v1/custom_check/group/<group>`; the actual path has no `/group` segment — it's `/v1/custom_check/<group>`.
   - Request body wrapped scripts directly under `config.scripts`. The correct shape (`RESTCustomCheckConfigData`) wraps them under `config.add.scripts` (or `update.scripts` / `delete.scripts`).

8. **Step 7 CronJob pointed at a non-existent endpoint and used an image without jq.** The inline script called `POST /v1/bench/host/all` and used `curlimages/curl:latest` which does not bundle jq (the auth step pipes through `jq`). Switched to `alpine:3.19` with `apk add curl jq`, then enumerated hosts via `/v1/host` and looped per-host calls to `/v1/bench/host/{id}/docker` and `/kubernetes`.

9. **Step 8 report endpoint was wrong.** It used the same non-existent `GET /v1/bench/host` and the same fabricated aggregate fields. Replaced with `GET /v1/compliance/asset` (handlerAssetCompliance) which returns `RESTComplianceAssetData.compliances[]` — a real cluster-wide aggregate keyed by check, with `name`, `category`, `level`, `description`, `nodes[]`, and `workloads[]`. Updated the CSV header and `jq` selectors to match the real response.

## Review Notes

- The list of supported frameworks (CIS K8s, CIS Docker, PCI DSS, HIPAA, GDPR, NIST 800-190) is accurate against `controller/api/apis.go`. NeuVector also supports PCIv4 and DISA templates which the post doesn't mention — not an error, just incomplete.
- The post's `level != "PASS"` filter could miss `"NOTE"` items (which mean "informational, not a finding"). Step 2 was tightened to also exclude `"NOTE"`, matching how `/v1/compliance/asset` itself filters internally.
- Valid `level` values per `share/clus_apis.go` are `PASS`, `INFO`, `WARN`, `MANUAL`, `HIGH`, `NOTE`, `ERROR`. The UI step describing "failed and warned checks" is fine as a summary.
- The post does not pin a NeuVector version. All endpoints/structs verified here are from `neuvector/neuvector` `main` and are consistent with the 5.x line.
- Authentication via username/password creates a session subject to NeuVector's per-user concurrent-session limit; a production guide should call `DELETE /v1/auth` after long-running batch jobs. Out of scope for the technical-correctness review.

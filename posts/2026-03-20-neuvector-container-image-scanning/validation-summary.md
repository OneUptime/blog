# Validation Summary: How to Run Container Image Scanning with NeuVector

## Status
validated

## Post Type
Tutorial / Guide — step-by-step walkthrough of NeuVector's REST API for triggering and consuming container image vulnerability scans.

## Technologies Covered
- NeuVector (Controller REST API, Manager UI, Scanner component)
- Container image vulnerability scanning / CVEs
- Kubernetes workloads
- curl + jq for API calls and JSON parsing

## Sources Consulted
- NeuVector REST API and Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector "Connect to Manager, REST API server" docs: https://open-docs.neuvector.com/configuration/console/
- NeuVector Build Phase Image Scanning docs: https://open-docs.neuvector.com/scanning/build/
- NeuVector source — REST router definitions (`controller/rest/rest.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go
- NeuVector source — REST API types (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector source — scanner handlers (`controller/rest/scanner.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/scanner.go

## Issues Found

1. **REST API host/port was wrong.** The post used `https://neuvector-manager:8443/...` for every API call. Port 8443 is the Manager web console; the REST API is served by the Controller and listens on **10443**. Replaced all URLs with `https://neuvector-svc-controller:10443/...` (the standard Kubernetes service name) to match the official docs.

2. **Wrong endpoint for "scan an image by tag".** The post called `POST /v1/scan/image`, which is not a valid endpoint for triggering a scan (`/v1/scan/image` is `GET` only and returns image summaries). The CI-style "scan a repository tag" endpoint is `POST /v1/scan/repository`. Updated the URL and the request body to match the `RESTScanRepoReq` struct (`registry`, `repository`, `tag`, `username`, `password`, `scan_layers` as separate fields — the previous `"tag": "nginx:1.24"` collapsed image and tag into one field).

3. **Followup GET to retrieve image scan results was bogus.** The post had `GET /v1/scan/image/nginx%3A1.24` — but `:id` on that route is an internal image ID, not a URL-encoded `name:tag`. `POST /v1/scan/repository` is a long-poll request that returns the report synchronously, so the separate GET is not needed. Removed it and piped the POST response through `jq '.report'` instead.

4. **Wrong path to vulnerabilities in the JSON response.** Every `jq` filter used `.report.vulnerability`, but the actual JSON field on `RESTScanReport` is `vulnerabilities` (plural — see `Vuls []*RESTVulnerability \`json:"vulnerabilities"\``). Fixed in all four `jq` snippets (Step 4 summary, Step 5 filter, Step 5 CSV export, and the count/select aggregations).

5. **Wrong endpoint to get a workload scan report.** The post used `GET /v1/scan/workload/${CONTAINER_ID}/report`. The actual route is `GET /v1/scan/workload/:id` (no `/report` suffix). Fixed in Steps 4 and 5.

6. **Invalid `scan_layers` field on scan config.** `RESTScanConfigConfig` has only `auto_scan`, `enable_auto_scan_workload`, and `enable_auto_scan_host`. There is no `scan_layers` field on the scan-config endpoint (that field belongs on the per-image `/v1/scan/repository` request). Removed `scan_layers: true` and switched to the modern `enable_auto_scan_workload` / `enable_auto_scan_host` flags (the `auto_scan` field is documented in the source as deprecated/kept for backward compatibility since 5.4.3+). Also removed the matching "Enable **Scan Layers**" UI step.

7. **Wrong webhook endpoint.** The post used `POST /v1/system/webhook`. The actual route is `POST /v1/system/config/webhook`. Fixed.

8. **Wrong `cfg_type` value on webhook.** The post used `"cfg_type": "user"`. The constant in `apis.go` is `CfgTypeUserCreated = "user_created"`. Fixed.

9. **Minor grammar fix.** "Images in a accessible registry" → "Images in an accessible registry".

10. **Vulnerability example was thin.** Added the `score_v3`, `vectors_v3`, and `link` fields that NeuVector populates on `RESTVulnerability` so the example matches what the API actually returns.

## Review Notes

- The Step 1 workload listing call was upgraded from `/v1/workload` to `/v2/workload`. Both routes exist, but the source code explicitly notes `// starting from 5.0, rest client should call this api.` for v2.
- The `auto_scan` field still exists on the API for backward compatibility but is marked deprecated in the source. The fix uses the newer per-target flags; readers on older NeuVector (<5.4.3) may need to fall back to `"auto_scan": true`.
- Username/password sessions hit a per-user concurrent-session limit; a production guide would call `DELETE /v1/auth` at the end. Out of scope for the technical-correctness review since the post explicitly demos a one-off scan flow, but worth noting for future revisions.
- The post does not pin a NeuVector version. All endpoints/structs verified here are from `neuvector/neuvector` `main` and are consistent with the 5.x line.

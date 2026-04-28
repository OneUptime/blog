# Validation Summary: How to Configure NeuVector Registry Scanning

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (registry scanning subsystem)
- NeuVector REST API (`/v1/scan/registry`)
- Container registries: Docker Hub, Harbor, Amazon ECR, Google Artifact Registry / Google Container Registry
- curl, jq, awk (CLI tooling for the examples)

## Sources Consulted
- NeuVector OpenAPI / Swagger spec (`controller/api/apis.yaml`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector REST API Go types (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go (RESTRegistryConfig, RESTRegistryConfigData, RESTAWSAccountKeyConfig, RESTGCRKeyConfig, RESTScanSchedule, RESTRegistrySummary, RESTScanStatus, RESTRegistryImageSummary, RESTScanBrief)
- NeuVector registry-type and schedule constants (`share/types.go`): https://github.com/neuvector/neuvector/blob/main/share/types.go (RegistryTypeDocker, RegistryTypeAWSECR, RegistryTypeGCR, RegistryTypeHarbor, RegistryTypeJFrog, ScanSchManual / ScanSchAuto / ScanSchPeriodical, ScanIntervalMin/Max)

## Issues Found

The post had several technical errors that would cause the API examples to fail or return wrong data. All have been corrected.

1. **Missing required `registry_type` field on every registry config** — `RESTRegistryConfig` lists `name` and `registry_type` as required in the swagger schema. The original Docker Hub, Harbor, ECR, and GAR examples all omitted it, so each POST would have been rejected. Added `"registry_type": "Docker Registry"`, `"Harbor Registry"`, `"Amazon ECR Registry"`, and `"Google Container Registry"` respectively (values come from the `RegistryType*` constants in `share/types.go`). Also added `registry_type` (and `name`) to the PATCH bodies in Steps 2, 3, and 7 so the updates round-trip correctly.

2. **Invalid schedule values `"daily"` and `"weekly"`** — NeuVector only accepts `manual`, `auto`, or `periodical` (see `ScanSchManual` / `ScanSchAuto` / `ScanSchPeriodical` constants). The interval is in seconds and is clamped to `[ScanIntervalMin=300, ScanIntervalMax=604800]`. Replaced the bogus `"daily"`/`"weekly"` schedules with `"periodical"` + `interval: 86400` (24h) and `interval: 604800` (7d), and added an explanatory paragraph in Step 3.

3. **AWS ECR credentials were placed at the top level** — the original used non-existent fields `auth_with_key`, `access_key_id`, `secret_access_key`, `aws_region`. The actual API nests them inside an `aws_key` object (`RESTAWSAccountKeyConfig`) with fields `id`, `access_key_id`, `secret_access_key`, `region`. Restructured the ECR example accordingly.

4. **Google Artifact Registry used a non-standard `auth_token` with a gcloud CLI token** — NeuVector's Google registry support uses `gcr_key.json_key` (a service account JSON key), as defined in `RESTGCRKeyConfig`. Rewrote the example to use `jq` to inject the service-account JSON into a `gcr_key` object under `registry_type: "Google Container Registry"` (the same registry type covers Artifact Registry).

5. **Wrong jq paths in the scan-status check** — the `GET /v1/scan/registry/{name}` response is `RESTRegistrySummaryData`, which wraps the registry under a single `summary` key (not separate `config` and `status` keys). Also, there is no `total` field; the embedded `RESTScanStatus` exposes `scanned`, `scheduled`, `scanning`, and `failed`. Rewrote the jq filter to use `.summary.*` and replaced the non-existent `total` with `scheduled` + `scanning`.

6. **Non-existent `low` field on registry image summaries** — `RESTRegistryImageSummary` embeds `RESTScanBrief`, which only exposes `critical`, `high`, and `medium` counters (no `low`). Removed `low: .low` from the jq filter in Step 5. Also renamed the (non-existent) `scan_date` output key to `scanned_at` to match the underlying field name.

## Review Notes
- The default REST API port for the NeuVector manager (`8443`) used in the examples is configurable via the `manager.svc.port` Helm value; readers using a non-default deployment may need to adjust the host/port.
- The `cfg_type: "user"` shown in the JSON bodies maps to NeuVector's `CfgTypeUserCreated`. This is the right value for user-created (UI/API) entries; federation- or ground-managed registries would use other values.
- NeuVector also exposes a `/v2/scan/registry` endpoint that splits the same fields into nested `auth`, `scan`, and `integrations` objects (`RESTRegistryConfigV2`). The post sticks with `/v1` throughout, which is fine — both versions are supported — but a future revision could cover the v2 shape for readers writing new automation.
- The CSV export in Step 6 keeps a `Critical,High,Medium` schema after the fixes; the section header text still says "high and critical CVEs" but the export covers an additional severity. Left intact since it is a stylistic mismatch, not a technical error.

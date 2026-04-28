# Validation Summary: How to Scan Container Registries with NeuVector

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- NeuVector (REST API on `/v1/auth`, `/v1/scan/registry`, `/v1/scan/registry/{name}/scan`)
- Docker Hub
- Harbor (robot accounts)
- Amazon Elastic Container Registry (ECR)
- AWS IAM / IRSA (IAM Roles for Service Accounts)
- Azure Container Registry (ACR), Azure CLI service principals
- Google Artifact Registry (GAR), `gcloud` CLI / GCP service accounts
- `kubectl`, `curl`, `jq`, Bash

## Sources Consulted
- NeuVector OpenAPI spec (`apis.yaml`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml — authoritative schema for `RESTRegistryConfig`, `RESTAWSAccountKeyConfig`, `RESTGCRKeyConfig`, `RESTScanSchedule`.
- NeuVector controller types (`share/types.go`): https://github.com/neuvector/neuvector/blob/main/share/types.go — definitive list of `RegistryType*` constants ("Docker Registry", "Harbor Registry", "Amazon ECR Registry", "Azure Container Registry", "Google Container Registry", etc.).
- NeuVector controller API (`controller/api/apis.go`) — `ScanSchManual = "manual"`, `ScanSchAuto = "auto"`, `ScanSchPeriodical = "periodical"`.
- NeuVector docs — Registry Scanning: https://open-docs.neuvector.com/scanning/registry/
- NeuVector docs — GCR via Service Accounts: https://open-docs.neuvector.com/scanning/registry/gcr-sa/
- NeuVector docs — REST API & Automation: https://open-docs.neuvector.com/automation/automation/
- AWS docs — IRSA service account annotation `eks.amazonaws.com/role-arn`.
- Azure docs — `az ad sp create-for-rbac --role AcrPull` for ACR pull-only service principals.
- GCP docs — `gcloud iam service-accounts create`, `gcloud projects add-iam-policy-binding`, `roles/artifactregistry.reader`.

## Issues Found

1. **Missing required `registry_type` field on every registry config.**
   - The NeuVector `RESTRegistryConfig` schema marks `registry_type` as required. None of the original examples set it.
   - Fix: added the appropriate `registry_type` value to each config — `"Docker Registry"` (Docker Hub), `"Harbor Registry"` (Harbor), `"Amazon ECR Registry"` (ECR), `"Azure Container Registry"` (ACR), `"Google Container Registry"` (GAR). Values verified against `share/types.go`.

2. **Invalid `schedule.schedule` values (`"daily"`, `"weekly"`).**
   - NeuVector only accepts `"manual"`, `"auto"`, or `"periodical"` (constants `ScanSchManual` / `ScanSchAuto` / `ScanSchPeriodical` in `controller/api/apis.go`). For `"periodical"`, `interval` is in seconds (range 5 minutes to 7 days).
   - Fix: replaced every `"schedule": "daily"` with `"schedule": "periodical", "interval": 86400` (one day, in seconds). Also fixed the Harbor example which had `"interval": 0` paired with `"daily"`.

3. **ECR auth fields used flat (incorrect) shape.**
   - Original used top-level `auth_with_key`, `access_key_id`, `secret_access_key`, `aws_region`. The schema places these inside an `aws_key` object (`RESTAWSAccountKeyConfig`) with fields `id`, `access_key_id`, `secret_access_key`, `region` — and there is no `auth_with_key` field on `RESTRegistryConfig`.
   - Fix: replaced the flat fields with a nested `"aws_key": { "id": "<account-id>", "access_key_id": "...", "secret_access_key": "...", "region": "us-east-1" }` block.

4. **GCR/GAR auth used Docker `_json_key` username convention, not the NeuVector API field.**
   - Original passed `"username": "_json_key"` with the JSON key as the password. The NeuVector API for GCR/GAR uses a `gcr_key` object with a `json_key` string field (`RESTGCRKeyConfig`).
   - Fix: switched to `"gcr_key": { "json_key": "<service-account-json>" }` and pre-encoded the file with `JSON_KEY=$(jq -Rs . < nv-scanner-key.json)` so the contents become a valid JSON string. Also dropped the brittle nested-`jq` pipeline that wouldn't have produced valid JSON.

## Review Notes
- The IRSA annotation example (`eks.amazonaws.com/role-arn=...`) is correct, but in practice NeuVector image pulls may also need the role attached to the scanner pod's service account (not just the controller) depending on your deployment topology. The post's wording is fine for an intro guide.
- Harbor robot accounts prefixed with `robot$` are valid (system-level robots in Harbor 2.2+). Project-scoped robots use `robot$<project>+<name>`.
- The Harbor docs page on NeuVector also describes a *pluggable scanner adapter* (Harbor calls NeuVector to scan), which is a different integration direction from what this post covers (NeuVector pulls from Harbor as a registry). That's out of scope here, but worth knowing if a reader wants in-Harbor scan triggers.
- The AWS access-key/secret-key sample values are AWS's documented placeholder credentials (`AKIAIOSFODNN7EXAMPLE` / `wJalrXUtnFEMI/...EXAMPLEKEY`); they're safe to leave as-is.
- `cfg_type` (e.g., `"user"`) is accepted by some NeuVector versions but is not required; omitting it is fine.

# Validation Summary: How to Back Up NeuVector Configuration - Configuration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (REST API and CRDs)
- Kubernetes (PersistentVolumeClaim, CronJob, CRDs, kubectl)
- Bash scripting (curl, jq, tar, find)
- YAML manifests

## Sources Consulted
- [NeuVector REST API and Automation docs](https://open-docs.neuvector.com/automation/automation/)
- [NeuVector controller apis.yaml (OpenAPI spec, main branch)](https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml)
- [NeuVector Helm chart CRD definitions](https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml)
- [NeuVector CRD - Custom Resource Definitions docs](https://open-docs.neuvector.com/policy/usingcrd/)
- Kubernetes API conventions (CRD plural names must be lowercase)

## Issues Found

1. **Wrong process profile endpoint.** The script used `GET /v1/process/profile?start=0&limit=500`, but NeuVector's REST API exposes process profiles at `/v1/process_profile` (single path segment with an underscore). Updated the curl call to use `${NV_URL}/v1/process_profile`.

2. **Wrong WAF sensor endpoint.** The script used `/v1/dpi/waf/sensor`. The actual NeuVector REST API path (per `controller/api/apis.yaml`) is `/v1/waf/sensor`. Updated.

3. **Wrong DLP sensor endpoint.** The script used `/v1/dpi/dlp/sensor`. The actual NeuVector REST API path is `/v1/dlp/sensor`. Updated.

4. **Non-existent webhooks GET endpoint.** The script issued `GET /v1/system/webhook`, which does not exist in the NeuVector REST API. Webhooks are managed under `/v1/system/config/webhook` (POST/PATCH only) and are returned as part of `GET /v1/system/config`. Replaced the curl call with a `jq` extraction of `.config.webhooks` from the already-saved `system-config.json` (the misleading "exclude URLs for security" comment, which the prior code did not actually do, was removed accordingly).

5. **Incorrect CRD plural name (mixed case).** Both the `RESOURCES` array in Step 3 and the CronJob script in Step 4 referenced `nvclusterSecurityrules` (with a capital `S`). Kubernetes CRD plural names are required to be all lowercase, and the helm chart defines the resource as `nvclustersecurityrules`. Updated both occurrences.

## Review Notes
- The `start=0&limit=...` query parameters on `/v1/group`, `/v1/policy/rule`, `/v1/admission/rule`, and `/v1/response/rule` are not strictly required (some endpoints may ignore them or use defaults), but they do not break the requests, so they were left as-is.
- The CRD list in Step 3 is not exhaustive — NeuVector also defines `nvcomplianceprofiles`, `nvvulnerabilityprofiles`, and `nvgroupdefinitions`. The post explicitly lists "all NeuVector CRDs" but only covers the five most common ones; this is a content-completeness concern rather than a technical error, so no edit was made.
- The restore script PATCHes `/v1/system/config` with the full backed-up `.config` payload. NeuVector's `RESTSystemConfigData` schema does accept a partial config, but operators should be aware that fields like `cluster_name` or federation-related settings may need adjusting between source and target clusters.
- The `bitnami/kubectl:latest` image used in the CronJob is fine for a how-to, but pinning to a specific tag is generally preferable for reproducibility. Not a technical error.

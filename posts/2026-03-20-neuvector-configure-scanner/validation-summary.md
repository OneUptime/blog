# Validation Summary: How to Configure NeuVector Scanner

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- NeuVector (container security platform)
- Kubernetes (Deployment, CronJob, kubectl)
- NeuVector Scanner / Updater components
- NeuVector REST API (v1)
- curl / jq

## Sources Consulted
- [NeuVector REST API and Automation Docs](https://open-docs.neuvector.com/automation/automation/)
- [NeuVector Scanning & Compliance Docs](https://open-docs.neuvector.com/scanning/scanning/)
- [NeuVector Updating the CVE Database Docs](https://open-docs.neuvector.com/scanning/updating/)
- [NeuVector Connect to Manager / REST API Server Docs](https://open-docs.neuvector.com/configuration/console/)
- [NeuVector controller/api/apis.go source](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.go) (verified `RESTScanConfigConfig` and `RESTSystemConfigConfig` field definitions)
- [NeuVector Helm chart](https://github.com/neuvector/neuvector-helm) (deployment names, image names, service names)

## Issues Found

1. **Invalid fields in `/v1/scan/config` payload (Step 4).** The original payload sent `scan_layers` and `cve_db_modify_time` to `PATCH /v1/scan/config`. Verified against `RESTScanConfigConfig` in `controller/api/apis.go`: the only valid fields are `auto_scan` (deprecated but still accepted), `enable_auto_scan_workload`, and `enable_auto_scan_host`. `scan_layers` is a per-registry config field (`RESTRegistryConfig.ScanLayers`), and `cve_db_modify_time` does not exist anywhere in the API definition. Fix: replaced the two invalid fields with `enable_auto_scan_workload` and `enable_auto_scan_host`.

2. **Invalid field `scan_report_retention` in `/v1/system/config` payload (Step 6).** Verified against `RESTSystemConfigConfig` in `controller/api/apis.go`: there is no `scan_report_retention` field (no field containing "retention" exists in the system config struct). `unused_group_aging` is valid (uint8, range 0-168 hours). Fix: removed the bogus field, kept `unused_group_aging`, and updated the section heading and description so they accurately describe what the remaining call does (configuring unused group aging) rather than a non-existent retention setting.

## Review Notes
- The `auto_scan` field is documented in the source as deprecated and kept for backward compatibility. New code should prefer `enable_auto_scan_workload` and `enable_auto_scan_host`. The post now sets all three for compatibility, which is reasonable.
- The post uses `https://neuvector-manager:8443/...` as the API endpoint. Strictly, the NeuVector REST API is hosted on the controller (default port 10443) and the Manager (port 8443) is the web console. NeuVector's own automation docs show the same `neuvector-manager:8443` placeholder pattern in some examples, so this was left as-is — readers will substitute their actual endpoint, and an Allinone or proxied deployment can expose the API on the Manager host.
- Default updater schedule `0 0 * * *` (daily at midnight) and the `neuvector-svc-controller` service name match the official Helm chart defaults.
- Image tags use `:latest`. NeuVector's docs explicitly recommend `latest` for scanner/updater so that CVE database updates are pulled, so this is intentional and correct.
- Scanner status field `cvedb_version` (used in Step 8's jq path) matches the `RESTScanner` struct in the API source.

# Validation Summary: How to Troubleshoot NeuVector Scanner Issues - A Practical Guide

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NeuVector (container security platform — Scanner, Controller, Updater, CVE database)
- NeuVector REST API (`/v1/scan/scanner`, `/v1/scan/registry`, `/v1/workload/:id`, `/v1/policy/rule`)
- Kubernetes (Deployments, CronJob, Jobs, Services, Pods, NetworkPolicy concepts)
- kubectl (logs, describe, exec, patch, scale, top, create job --from=cronjob)
- curl + jq for API interactions
- Bash scripting (diagnostics collection)

## Sources Consulted
- NeuVector controller source `controller/api/apis.go` — `RESTWorkload`, `RESTWorkloadBrief`, `RESTScanBrief`, scan-status constants, `RESTPolicyRuleInsert`, `RESTPolicyRuleActionData`, `LearnedExternal`
- NeuVector controller source `controller/rest/rest.go` — route table for `/v1/policy/rule` (PATCH for action, no POST)
- NeuVector Helm chart (`neuvector/neuvector-helm`) — scanner deployment name/labels (`neuvector-scanner-pod`), updater CronJob (`neuvector-updater-pod`), controller service (`neuvector-svc-controller`), `CLUSTER_JOIN_ADDR` env var, cluster gRPC port `18300`
- NeuVector documentation: https://open-docs.neuvector.com/

## Issues Found

1. **Wrong scan-status constant.** In Step 6, the listed status `not_supported` was incorrect. Per `controller/api/apis.go`, the constant is `ScanStatusUnsupported = "unsupported"` (alongside `scheduled`, `scanning`, `finished`, `failed`, `failed_signature_scan`). Fixed the comment to `unsupported`.

2. **Wrong HTTP method for inserting policy rules.** Step 7 used `POST /v1/policy/rule`. The route table only registers `GET`, `PATCH`, and `DELETE` for `/v1/policy/rule` — there is no `POST`. The insert/move/delete actions go through `handlerPolicyRuleAction` which is bound to `PATCH`. The `{"insert": {"after": ..., "rules": [...]}}` body shape (`RESTPolicyRuleActionData` with `RESTPolicyRuleInsert`) is correct. Changed the curl invocation to `-X PATCH`.

3. **Wrong destination group name for "internet".** The rule used `nv.ip.internet`, which is not a valid NeuVector group. The `nv.ip.*` prefix denotes learned service-IP address groups (`LearnedSvcGroupPrefix`). The predefined group representing external/internet endpoints is the constant `external` (`LearnedExternal`). Changed the destination to `external` so the rule matches the documented predefined external group used for egress to non-cluster destinations.

## Review Notes
- Port `8443` is used as the API base URL throughout the post. Strictly per docs, the controller REST API is on port `10443` (service `neuvector-svc-controller-api`) and `8443` is the Manager web-UI. The OneUptime NeuVector blog series has consistently used `8443` (assuming a deployment that exposes the REST API on that port via a service or proxy), so this was left unchanged for consistency. Readers should adjust to their cluster's actual REST API port.
- The wget connectivity test in Step 3 targets the cluster gRPC port `18300` with HTTP. wget will not get a clean HTTP response from a gRPC endpoint, but the `||` fallback still flags hard connection failures, so the test functions as a basic TCP-reachability check. A `nc -zv` or grpcurl probe would be more idiomatic but the existing approach is not strictly wrong.
- `GET /v1/workload/:id` correctly returns a workload object whose `scan_summary` contains the `status` field used by the jq query in Step 6. For full vulnerability detail (CVEs etc.) readers would use `GET /v1/scan/workload/:id`, but the post only needs the brief status which is on the workload object itself.
- The kubectl strategic-merge `patch deployment` body matches the canonical `neuvector-scanner-pod` container name from the Helm chart, so the patch will apply cleanly.
- Scanner pod label `app=neuvector-scanner-pod`, controller service `neuvector-svc-controller`, updater CronJob `neuvector-updater-pod`, and `CLUSTER_JOIN_ADDR` env var are all confirmed against the official Helm chart manifests.

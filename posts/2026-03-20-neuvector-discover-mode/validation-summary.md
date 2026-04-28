# Validation Summary: How to Configure NeuVector Discover Mode

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (open-source Kubernetes container security platform)
- NeuVector REST API (v1)
- Kubernetes (kubectl, namespaces, services, jobs)
- Bash / curl / jq for API automation

## Sources Consulted
- NeuVector Official Documentation - Modes (Discover/Monitor/Protect): https://open-docs.neuvector.com/policy/modes/
- NeuVector Official Documentation - Groups: https://open-docs.neuvector.com/policy/groups/
- NeuVector Official Documentation - Process Profile Rules: https://open-docs.neuvector.com/policy/processrules/
- NeuVector Official Documentation - REST API and Automation: https://open-docs.neuvector.com/automation/automation/
- NeuVector Official Documentation - Console / REST API server: https://open-docs.neuvector.com/configuration/console/
- NeuVector source code - REST router (`controller/rest/rest.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go
- NeuVector source code - API struct definitions (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector source code - shared types and policy mode constants (`share/types.go`): https://github.com/neuvector/neuvector/blob/main/share/types.go
- Cross-checked against the validated `2026-03-20-neuvector-monitor-mode`, `2026-03-20-neuvector-zero-trust-mode`, and `2026-03-20-neuvector-process-profile-rules` posts in this repo.

## Issues Found

Three technical errors were corrected. All involved REST endpoint paths or payload schemas that do not exist in the NeuVector controller — verified by cross-referencing the route table in `controller/rest/rest.go` and the struct definitions in `controller/api/apis.go`.

1. **Step 5 - Process profile endpoint path.**
   The original used `GET /v1/process/profile/group/nv.webapp.production`. No such path is registered in the controller. The actual route is `/v1/process_profile/{name}` (single path segment, underscore, no `/group/` prefix; see `rest.go` and the validated `process-profile-rules` post). Updated the URL. The response shape (`.process_profile.process_list[]`) was already correct and was kept as-is.

2. **Step 7 - Mode change endpoint and payload.**
   The original used `PATCH /v1/group/nv.webapp.production` with body `{"config": {"mode": "Discover"}}`. The `RESTGroupConfig` struct in `controller/api/apis.go` does NOT have a `mode` or `policy_mode` field — group config holds `Name`, `Comment`, `Criteria`, `CfgType`, `MonMetric`, and rate/bandwidth settings only. Policy mode for service groups lives on `RESTServiceConfig` and is set via `PATCH /v1/service/config` with the `RESTServiceBatchConfig` schema (`{"config": {"services": [...], "policy_mode": "Discover"}}`). Rewrote the example to use the correct endpoint and payload.

3. **Step 8 - Auto-promote script: same mode change schema issue, plus per-group loop.**
   The original looped over groups and submitted one `PATCH /v1/group/${GROUP}` per service with `{"config": {"mode": "Monitor"}}`. Same schema problem as Step 7. Rewrote the script to (a) collect the list of `nv.*` service groups currently in Discover mode, (b) build a JSON array of names, and (c) issue a single batched `PATCH /v1/service/config` request with `{"config": {"services": [...], "policy_mode": "Monitor"}}`. Added an early-exit when no services are found and updated the surrounding language from "groups" to "services" to match the underlying API.

## Review Notes

- Mode values `Discover`, `Monitor`, `Protect` (capitalized) are correct — they map to the constants `PolicyModeLearn`, `PolicyModeEvaluate`, `PolicyModeEnforce` in `share/types.go`.
- Step 1's `GET /v1/group` filter on `policy_mode == "Discover"` is correct: `policy_mode` IS exposed on `RESTGroupBrief` (the GET response), even though it is not settable on `RESTGroupConfig` (the PATCH body).
- Step 2's `PATCH /v1/system/config` with `new_service_policy_mode` is correct (verified in `apis.go` and consistent with the validated `monitor-mode` post).
- Step 4's `GET /v1/policy/rule` filter on `cfg_type == "learned"` is correct — `learned` is a valid `CfgType` value alongside `user_created`, `ground`, `federal`, etc.
- The post uses `https://neuvector-manager:8443/...` as the API base URL. In NeuVector's reference Helm deployment, port `8443` is the manager (web UI) and the controller's REST API is on port `10443` (`neuvector-svc-controller-api`). Some deployments expose the API through the manager on `8443`, so this was left as-is, but readers running the official Helm chart unchanged may need to substitute the controller API service and port `10443`.
- The `?start=0&limit=N` query parameters on `GET /v1/group` and `GET /v1/policy/rule` are not part of the documented spec and are silently ignored by the controller, so the calls still work; left untouched where used.
- Group naming convention `nv.<service>.<namespace>` is correct per the official Groups documentation.
- The UI navigation paths (`Policy > Groups`, `Network Activity`, `Process Profile` tab) reflect the current NeuVector Manager UI.
- The recommendation to spend 24-48 hours (and at least 48 hours for most applications) in Discover mode is a reasonable rule of thumb; official docs simply recommend a "sufficient learning period" without naming a specific window.

# Validation Summary: How to Configure NeuVector Monitor Mode

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (open-source Kubernetes container security platform)
- NeuVector REST API (v1)
- Kubernetes (namespaces, services)
- Bash / curl / jq for API automation

## Sources Consulted
- NeuVector Official Documentation - Modes (Discover/Monitor/Protect): https://open-docs.neuvector.com/policy/modes/
- NeuVector Official Documentation - REST API and Automation: https://open-docs.neuvector.com/automation/automation/
- NeuVector Official Documentation - Console / REST API server: https://open-docs.neuvector.com/configuration/console/
- NeuVector Official Documentation - Groups: https://open-docs.neuvector.com/policy/groups/
- NeuVector source code - REST router (`controller/rest/rest.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go
- NeuVector source code - API struct definitions (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector source code - Event/log API definitions (`controller/api/log_apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/log_apis.go
- NeuVector source code - shared types and policy mode constants (`share/types.go`): https://github.com/neuvector/neuvector/blob/main/share/types.go
- Cross-checked against the validated `2026-03-20-neuvector-zero-trust-mode` and `2026-03-20-neuvector-process-profile-rules` posts in this repo.

## Issues Found

Six technical errors were corrected, all involving incorrect REST endpoint paths, methods, or payload schemas. Source code verification was used as ground truth — `controller/rest/rest.go` registers the actual route table.

1. **Step 1 - Mode change endpoint and payload (most significant fix).**
   Original used `PATCH /v1/group/{name}` with body `{"config": {"mode": "Monitor"}}`. The `RESTGroupConfig` struct in `controller/api/apis.go` does NOT have a `mode` or `policy_mode` field — group config holds `Name`, `Comment`, `Criteria`, `CfgType`, `MonMetric`, and rate/bandwidth settings only. Policy mode for service groups lives on `RESTServiceConfig` and is set via `PATCH /v1/service/config` with the `RESTServiceBatchConfig` schema (`{"config": {"services": [...], "policy_mode": "Monitor"}}`). Rewrote the single-service example, and switched the bulk-namespace loop to a single batched `PATCH /v1/service/config` request using a JSON array of service names. Also changed the `jq` filter from a fragile substring match (`.name | contains(".production")`) to the canonical `.domain == "production"` field exposed by `RESTGroupBrief`.

2. **Steps 3, 4, 7 - Event endpoint path.**
   Original used `GET /v1/event?type=security`. This endpoint does not exist in `rest.go`; the only registered events route is `r.GET("/v1/log/event", handlerEventList)` (rest.go:1837). Removed the unsupported `?type=security` query parameter and changed every event call to `/v1/log/event`. Also dropped the non-existent `.type` field from the analysis jq pipeline (events use `.name`, e.g. `Process.Profile.Violation`, which is the correct constant from `log_apis.go`).

3. **Step 5 - Process profile allow-list endpoint and payload.**
   Original used `POST /v1/process/profile/group/{name}/process` with a `{"process": {...}}` body. No such path exists. The actual route is `PATCH /v1/process_profile/:name` (note underscore, no `/group/` segment, no `/process` subpath; rest.go:1750), and the body uses `process_profile_config` containing a `process_change_list` array (matches the validated `process-profile-rules` post in this repo).

4. **Step 5 - Network rule creation endpoint and payload.**
   Original used `POST /v1/policy/rule`. The router only registers `PATCH /v1/policy/rule` for create/insert (rest.go:1781) — `POST` only exists for `/v1/policy/rules/promote` (note plural). Changed method to `PATCH`. Also fixed `cfg_type: "user"` to `cfg_type: "user_created"` (the canonical `CfgTypeUserCreated` constant), removed the misleading `"after": 0` (omitting `after` inserts the rule last; `0` would mean "insert as first" which contradicts the comment), added the required `"applications": []` field, and added an explicit `"id": 0` to match the documented `RESTPolicyRuleInsert` shape.

5. **Step 6 - Response rule creation endpoint and payload.**
   Original used `POST /v1/response/rule` with a `{"config": {...}}` body. `POST` is not registered for this path; create/insert uses `PATCH /v1/response/rule` with an `{"insert": {"rules": [...]}}` body (rest.go:1788). Also corrected the condition field name from `"type": "level"` to `"name": "level"` — `CLUSEventCondition` uses a `name` field, not `type`. Added the required `group` field (`"containers"` is the built-in group representing all containers) and `cfg_type: "user_created"`.

6. **Step 4 - Event field name in jq pipeline.**
   Original referenced `.type` for event categorization. The `Event` payload (`controller/api/log_apis.go`) does not expose a `type` field; events are identified by `.name` (e.g. `Process.Profile.Violation`). Updated all three jq queries to group/select by `.name`.

## Review Notes

- Mode values `Discover`, `Monitor`, `Protect` (capitalized) — verified as the exact string constants `PolicyModeLearn`, `PolicyModeEvaluate`, `PolicyModeEnforce` in `share/types.go`.
- The `new_service_policy_mode` field in Step 2 is correct (verified in `apis.go`).
- Group naming convention `nv.<service>.<namespace>` is correct per `open-docs.neuvector.com/policy/groups/`.
- Event field names `workload_name`, `proc_name`, `proc_path`, and `level` (with the value `"Critical"` from `LogLevelCRIT`) are all canonical per `log_apis.go`.
- The post uses `https://neuvector-manager:8443/...` as the API base URL. In NeuVector's reference Helm deployment, port `8443` is the manager (web UI) and the controller's REST API is on port `10443` (`neuvector-svc-controller-api`). Some deployments expose the API through the manager service on `8443`, so this was left as-is, but readers running the official Helm chart unchanged may need to substitute the controller API service and port `10443`.
- `?start=0&limit=N` query parameters are not part of the documented spec for `/v1/group` or `/v1/log/event` and are silently ignored by the controller, so the calls still work; left untouched where used.
- Several other validated posts in this repo (`protect-mode`, `discover-mode`) still use the deprecated `PATCH /v1/group/{name}` mode-change pattern and `/v1/event?type=security` event path. Those should be revisited; the corrections in this post align with the rigorous source-code-verified findings in the `zero-trust-mode` validation.
- The `level` condition value `"warning"` (lowercase) used in the response rule is correct per NeuVector's documented condition values; this differs from event payload `level` values (`"Critical"`, `"Warning"`, etc., which are capitalized). The post uses each correctly in its respective context.

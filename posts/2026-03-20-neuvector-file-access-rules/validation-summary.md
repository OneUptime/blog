# Validation Summary: How to Configure NeuVector File Access Rules

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NeuVector (file access rules, file integrity monitoring)
- NeuVector REST API (`/v1/file_monitor`, `/v1/log/incident`)
- NeuVector NvSecurityRule CRD
- Kubernetes / kubectl
- curl, jq

## Sources Consulted
- [NeuVector Docs — File Access Rules](https://open-docs.neuvector.com/policy/filerules/)
- [NeuVector Docs — CRD (Custom Resource Definitions)](https://open-docs.neuvector.com/policy/usingcrd/)
- [NeuVector Docs — REST API and Automation](https://open-docs.neuvector.com/automation/automation/)
- [NeuVector Docs — Modes: Discover, Monitor, Protect](https://open-docs.neuvector.com/policy/modes/)
- NeuVector source code, `controller/api/apis.go` (`RESTFileMonitorFilter`, `RESTFileMonitorProfile`, `RESTFileMonitorConfig`)
- NeuVector source code, `controller/rest/rest.go` (route table — `/v1/file_monitor`, `/v1/log/incident`, `/v1/log/event`)
- NeuVector source code, `controller/rest/file_monitor.go` (`handlerFileMonitorConfig`, `handlerFileMonitorShow`)
- NeuVector source code, `controller/api/log_apis.go` (`Incident`, `Event`, `LogCommon`)
- NeuVector source code, `controller/resource/nvsecurityrule_def.go` (`NvSecurityFileRule`, `NvSecurityTarget`)
- NeuVector source code, `share/types.go` (`FileAccessBehaviorBlock = "block_access"`, `FileAccessBehaviorMonitor = "monitor_change"`)

## Issues Found

1. **Wrong REST API endpoint path for file profiles.** The post used `/v1/file/profile/group/<name>`, but NeuVector exposes file profiles at `/v1/file_monitor/<name>` (GET to read, PATCH to modify). Updated all `curl` examples in Steps 1, 3, and 5.

2. **Wrong HTTP method for modifying file profiles.** The post used `POST` to add filters; the actual handler is registered as `PATCH /v1/file_monitor/:name`. Changed `-X POST` to `-X PATCH` in Steps 3 and 5.

3. **Wrong JSON wrapper / field names in API request body.** The post used `process_profile.process_list`, which is invalid. The configuration endpoint expects `config.add_filters` (or `delete_filters` / `update_filters`) per `RESTFileMonitorConfig`. Updated request bodies in Steps 3 and 5. Also updated the `jq` query in Step 1 from `.process_profile.process_list` to `.profile.filters` to match `RESTFileMonitorProfileData`.

4. **Wrong `behavior` enum values.** The post used `"monitor change"` and `"block access"` (with spaces). The valid constants are `monitor_change` and `block_access` (with underscores), per `share.FileAccessBehaviorMonitor` / `FileAccessBehaviorBlock`. Updated all occurrences in API bodies and CRDs (Steps 3, 4, 5, 7).

5. **Invalid CRD selector format.** The post used Kubernetes-style `selector.matchLabels`, which `NvSecurityTarget` does not support. The CRD's selector is a `RESTCrdGroupConfig` requiring a `name` plus `criteria` array (`key`, `op`, `value`). Replaced `matchLabels` blocks in Steps 4 and 7 with proper `name` + `criteria` selectors and aligned the `metadata.name` to the NeuVector group naming convention.

6. **Wrong field name for applications list in CRD.** `NvSecurityFileRule` uses `app` (singular) for the application list, not `applications`. Updated Steps 4 and 7.

7. **Removed fictitious `deny-write` "application".** The original Step 4 listed an application named `deny-write`, which is not a valid process name or NeuVector keyword — `app` is a list of process names. Removed the entry while keeping the rule semantics (block writes by all processes when `app` is omitted).

8. **Wrong events endpoint and response structure.** The post used `/v1/event?type=file` returning `.events[] ... .at`. NeuVector exposes logs at `/v1/log/event`, `/v1/log/incident`, `/v1/log/security`, etc. File access violations are surfaced as incidents (`Incident` struct in `log_apis.go` includes `file_path`, `file_name`, `proc_name`). Switched Steps 6 and 8 to `/v1/log/incident`, the response key `.incidents[]`, and replaced the non-existent `.at` field with `.reported_at` (from `LogCommon`). Step 8 also replaced `.namespace` with `.workload_domain`, the actual field on `Incident`.

## Review Notes

- The behavior values `block_access` / `monitor_change` are common stumbling blocks: the UI displays them as "Block" and "Monitor", but the API and CRD require the snake_case enum strings.
- `Incident.file_name` is a string array (`[]string`), so for multi-file incidents the `jq` expression will emit a JSON array under the `file` key. That is intentional and correct for the API shape.
- Per the NeuVector docs, blocking enforcement depends on the container storage driver. AUFS environments default to monitor-only for file create/modify, even when `block_access` is configured. Worth highlighting in a future revision for users on older runtimes.
- The API examples assume `${TOKEN}` is already obtained via `POST /v1/auth`. The post does not show that step; it could be called out in a future revision for completeness.
- The post does not pin a NeuVector version. The endpoints, CRD shape, and behavior constants verified above are present on `main` (5.x line); older 4.x deployments may differ.

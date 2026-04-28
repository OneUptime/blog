# Validation Summary: How to Configure NeuVector DLP Sensors

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (Container Security / DPI / DLP)
- NeuVector REST API (v1)
- NeuVector Custom Resource Definitions (`NvSecurityRule`, `apiVersion: neuvector.com/v1`)
- Kubernetes (kubectl)
- curl + jq for API interaction
- PCRE regular expressions (used by NeuVector DPI engine)

## Sources Consulted
- NeuVector REST API spec — [controller/api/apis.yaml](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml)
- NeuVector REST struct definitions — [controller/api/apis.go](https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go) (`RESTDlpSensorConfigData`, `RESTDlpSensorConfig`, `RESTDlpRule`, `RESTDlpCriteriaEntry`, `RESTDlpGroupConfig`, `RESTDlpConfig`, `RESTCrdDlpGroupSetting`)
- Threat log struct — [controller/api/log_apis.go](https://github.com/neuvector/neuvector/blob/main/controller/api/log_apis.go) (`Threat`, `LogCommon`, `ThreatActionMonitor/Allow/Block/Reset` constants)
- DLP rule handlers / validators — [controller/rest/dlp_rule.go](https://github.com/neuvector/neuvector/blob/main/controller/rest/dlp_rule.go) (`validateDlpRuleConfig`, `handlerDlpSensorCreate`, `handlerDlpGroupConfig`)
- Operator / context constants — [share/criteria.go](https://github.com/neuvector/neuvector/blob/main/share/criteria.go) and [share/clus_apis.go](https://github.com/neuvector/neuvector/blob/main/share/clus_apis.go)
- DLP action constants — [share/types.go](https://github.com/neuvector/neuvector/blob/main/share/types.go) (`DlpRuleActionAllow = "allow"`, `DlpRuleActionDrop = "deny"`)
- CRD definitions — [controller/resource/nvsecurityrule_def.go](https://github.com/neuvector/neuvector/blob/main/controller/resource/nvsecurityrule_def.go) (`NvSecurityDlpGroup` with `status` + `settings`)
- Official docs — [DLP & WAF Sensors](https://open-docs.neuvector.com/policy/dlp/), [REST API and Automation](https://open-docs.neuvector.com/automation/automation/), [CRD - Custom Resource Definitions](https://open-docs.neuvector.com/policy/usingcrd/)

## Issues Found

1. **Wrong REST API path for DLP sensors.** The post used `https://neuvector-manager:8443/v1/dpi/dlp/sensor`. The actual NeuVector REST API exposes DLP sensor management at `/v1/dlp/sensor` (no `/dpi` prefix), and the controller REST port is `10443` (not `8443`, which is the manager web UI port). Fixed in Steps 2, 3, 4, and 8.

2. **Wrong endpoint and body for attaching sensors to a group.** The post used `PATCH /v1/group/{name}` with a `dlp_sensors` field. The correct endpoint is `PATCH /v1/dlp/group/{name}`, and the body is a `RESTDlpGroupConfigData` wrapping `{name, status, replace, sensors, delete}`. Fixed in Step 5 to use `replace` for full-list replacement.

3. **Invalid `action` values for DLP.** The post used `"action": "block"` and `"action": "alert"`. NeuVector's DLP action validator (`controller/rest/dlp_rule.go:1200`) accepts only `"allow"` and `"deny"` (constants `DlpRuleActionAllow`/`DlpRuleActionDrop`). Whether `deny` actually drops traffic depends on the group's policy mode. Fixed in Step 5 (REST + UI instructions) and Step 6 (CRD).

4. **Wrong CRD field name for DLP settings.** The post used `spec.dlp.dlp:` as a list of name+action entries. The CRD struct (`NvSecurityDlpGroup` in `nvsecurityrule_def.go:171-189`) defines the field as `spec.dlp.settings`, with sibling `status: bool`. Fixed in Step 6.

5. **Wrong pattern field `key`.** The post used `"key": "packet"`, conflating the `key` field with the `context` field. The `key` is a fixed identifier (`"pattern"`); the location to match against is the `context` field (`url`/`header`/`body`/`packet`). Fixed across all sensor definitions.

6. **Spurious `name` field on patterns.** The post added a `name` per pattern (e.g. `"name": "ssn-pattern"`). `RESTDlpCriteriaEntry` has only `key`, `op`, `value`, `context` — there is no per-pattern name. The `name` belongs on the rule, not the pattern. Removed from all pattern objects.

7. **Wrong endpoint for monitoring DLP events.** The post used `GET /v1/event?type=dlp`. There is no such endpoint or filter; DLP detections are reported as threats via `GET /v1/log/threat`, returning `{threats: [...]}` with each threat shaped per the `Threat` struct in `log_apis.go`. Fixed Step 7's curl + jq filter to use real field names (`name`, `sensor`, `group`, `severity`, `action`, `client_workload_name`, `server_workload_name`, `reported_at`) and added a clarifying note that threat `action` values are `allow`/`alert`/`deny`/`reset`.

8. **Misleading `context` for credential and PHI patterns.** The post matched all credential/PHI rules against `context: packet`. While `packet` is a valid context, NeuVector's DLP engine (per `share/clus_apis.go`) is more efficient and accurate when matching HTTP `body` (POST/JSON payloads) or `url` (query strings). Switched to `body` for credential/PHI patterns and `url` for the password-in-URL rule, leaving SSN/credit-card/email at `packet` since they may appear in arbitrary protocols. (PCRE regex content is unchanged.)

## Review Notes

- The regex for SSNs intentionally excludes invalid SSA blocks (`000`, `666`, `9xx`, `00`, `0000`) and is left unchanged — it is a well-known correct pattern.
- The credit-card regex covers Visa/MasterCard/Amex but not Discover/JCB/Diners; this is a stylistic choice, not an error.
- Per `controller/api/apis.go:139-144` there are payload limits: ≤16 patterns per rule, ≤512 chars per pattern, ≤1024 chars total per rule. The examples are well within these limits.
- The `replace` array in the group PATCH replaces the full sensor list; for additive operations callers should use `sensors` + `delete` instead. The post uses `replace` which matches its "apply this set of sensors" framing.
- The threat log filter `select(.sensor != "")` is a pragmatic way to surface DLP/WAF threats (both populate the `sensor` field), since there is no built-in `type=dlp` filter on `/v1/log/threat`. Users wanting strictly DLP-originated threats can additionally filter by `name | startswith("DLP")` if their NeuVector version emits names with that prefix.
- Port `10443` is the default controller REST API port; this can be customized via Helm values, so readers in clusters with a non-default port should adjust accordingly.

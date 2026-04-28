# Validation Summary: How to Set Up NeuVector for HIPAA Compliance

## Status
validated

## Post Type
Tutorial / Compliance Guide

## Technologies Covered
- NeuVector (REST API, DLP sensors, file/process rules, syslog forwarding, CIS benchmarks)
- NeuVector Custom Resource Definitions (`NvSecurityRule`)
- Kubernetes (`kubectl`, label-based pod selection)
- HIPAA Security Rule (45 CFR 164.308 / 164.312)
- bash, curl, jq

## Sources Consulted
- NeuVector source code: https://github.com/neuvector/neuvector
  - `controller/rest/rest.go` (REST endpoint registrations)
  - `controller/rest/dlp_rule.go` (`validateDlpRuleConfig` — DLP pattern field validation)
  - `controller/rest/user.go` (`handlerUserCreate` — user create payload + password hashing)
  - `controller/rest/system.go` (`syslog_categories` validation)
  - `controller/api/apis.go` (`RESTGroupConfig`, `RESTDlpGroupConfig`, `RESTDlpConfig`, `RESTDlpRule`, `RESTDlpCriteriaEntry`, `RESTUserConfig`, `RESTUser`)
  - `controller/resource/nvsecurityrule_def.go` (CRD: `NvSecurityFileRule`, `NvSecurityProcessRule`)
  - `share/types.go` (policy mode strings, DLP/process action constants, file behavior constants)
  - `share/clus_apis.go` (`DlpRuleKeyPattern`, `DlpPatternContext*` constants)
  - `share/criteria.go` (criterion operators)
  - `controller/api/log.go` (`Category*` constants)
- NeuVector public docs: https://open-docs.neuvector.com/

## Issues Found

1. **Incorrect DLP sensor endpoint.** Post used `POST /v1/dpi/dlp/sensor`. The actual route registered in `controller/rest/rest.go` is `POST /v1/dlp/sensor` (no `dpi/` prefix). Changed.

2. **Incorrect endpoint and payload for attaching a DLP sensor to a group.** Post used `PATCH /v1/group/phi-workloads` with a `dlp_sensors` field, but `RESTGroupConfig` has no `dlp_sensors` field. The correct route is `PATCH /v1/dlp/group/{name}` with body `RESTDlpGroupConfig` (`name`, `status`, `sensors` / `replace` / `delete`). Changed the URL and rewrote the body to use `replace` and include `name` / `status`.

3. **Invalid DLP sensor action value.** Post used `"action": "alert"`. Per `share/types.go`, the only valid DLP rule actions are `"allow"` (`DlpRuleActionAllow`) and `"deny"` (`DlpRuleActionDrop`). Changed to `"deny"` (appropriate for HIPAA — block PHI exfiltration).

4. **Invalid DLP pattern entry shape.** Post included a `name` field on each pattern entry. `RESTDlpCriteriaEntry` only has `key`, `value`, `op`, `context` — there is no `name` on a pattern. Removed the `name` field from each pattern. Also changed `key` from `"packet"` to `"pattern"` to match the documented constant `DlpRuleKeyPattern = "pattern"`. (`context: "packet"` is correct and was left as-is — it's one of the valid `DlpPatternContext*` values: `url`, `header`, `body`, `packet`.)

5. **Non-existent CIS benchmark endpoints.** Post used `POST /v1/bench/host/all` and `GET /v1/bench/host`. Neither exists. NeuVector only exposes per-host routes: `/v1/bench/host/{id}/docker` and `/v1/bench/host/{id}/kubernetes`. Rewrote the report script to first enumerate hosts via `GET /v1/host`, then iterate and call `POST /v1/bench/host/${HOST_ID}/kubernetes` per host, then aggregate per-host results from `GET /v1/bench/host/${HOST_ID}/kubernetes` (counting items by `level == "PASS"` / `"WARN"`).

6. **Invalid file rule field name.** Post used `applications:` in the `NvSecurityRule` file rule. The CRD struct `NvSecurityFileRule` defines that field as `App []string \`json:"app"\``. Changed `applications` to `app`.

7. **Invalid file rule behavior values.** Post used `behavior: monitor change` and `behavior: block access` (with spaces). Per `share/types.go`, valid values are `monitor_change` (`FileAccessBehaviorMonitor`) and `block_access` (`FileAccessBehaviorBlock`). Changed both occurrences.

8. **Invalid `syslog_categories` values.** Post included `"incident"` and `"violation"`. The validator in `controller/rest/system.go` only accepts `"event"` (`CategoryEvent`), `"security-event"` (`CategoryRuntime`), and `"audit"` (`CategoryAudit`). Per the comments in `controller/api/log.go`, `incident` and `violation` are merged into `security-event` for syslog config. Removed the two invalid entries.

9. **Missing `password` field on user creation.** Post omitted `password`, which `handlerUserCreate` always passes through `HashPassword` and `isWeakPassword` — an empty/weak value is rejected. Added a placeholder strong password and wrapped the body in `"user": { ... }` (the `POST /v1/user` route consumes `RESTUserData{User *RESTUser}`, not `RESTUserConfig`). Note: `RESTUser.Password` uses the JSON tag `password`.

## Review Notes

- The CIS benchmark report logic now counts items where `level == "WARN"` as failures. NeuVector benchmark items report `level` values such as `"PASS"`, `"WARN"`, `"INFO"`, and `"NOTE"`. `WARN` is the conventional failure indicator; `INFO` and `NOTE` are advisory and intentionally not counted.
- The post still uses NeuVector's REST API directly with `X-Auth-Token`. Token acquisition via `POST /v1/auth` is implied as a prerequisite — readers unfamiliar with NeuVector may need to consult the auth flow separately.
- The post's HIPAA control mappings (e.g., `Workstation Security`, `Malicious Software Protection`) reference HIPAA Security Rule administrative/technical safeguard concepts. These are correctly framed but, like all such mappings, are interpretive — a HIPAA assessor would map controls based on the organization's risk analysis. Mappings were left unchanged.
- The SSN regex correctly excludes invalid SSA-rule prefixes (`000`, `666`, `9XX`) and middle/end groups (`00`, `0000`). Reasonable for basic detection.
- The user creation body uses an empty global `role: ""` plus `role_domains` with per-namespace mappings — this is the correct shape for a "domain-only" multi-role user in NeuVector.
- Process rule actions `"allow"` / `"deny"` are correct (`PolicyActionAllow` / `PolicyActionDeny` in `share/types.go`).
- Policy mode `"Protect"` (capitalized) in the CRD `target.policymode` is correct (`PolicyModeEnforce = "Protect"`).

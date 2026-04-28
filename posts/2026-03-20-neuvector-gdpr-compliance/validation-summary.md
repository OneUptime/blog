# Validation Summary: How to Set Up NeuVector for GDPR Compliance

## Status
validated

## Post Type
Tutorial / Compliance Guide

## Technologies Covered
- NeuVector (REST API, admission control, DLP sensors, response rules, syslog integration)
- NeuVector Custom Resource Definitions (`NvClusterSecurityRule`)
- Kubernetes
- GDPR (General Data Protection Regulation)
- bash, curl, jq

## Sources Consulted
- NeuVector source code: https://github.com/neuvector/neuvector
  - `controller/rest/rest.go` (REST endpoint registrations)
  - `share/criteria.go` (admission control criterion keys and operators)
  - `controller/api/apis.go` (REST API field definitions, including `RESTScanBrief`, `RESTResponseRule`, `RESTDlpGroupConfig`, `RESTCrdGroupConfig`)
  - `controller/resource/nvsecurityrule_def.go` (CRD definitions for `NvClusterSecurityRule`)
  - `controller/rest/system.go` (syslog category validation)
  - `controller/api/log_apis.go` (log category constants)
  - `controller/rest/crdsecurityrule_test.go` and `controller/rest/group_test.go` (canonical YAML examples)
  - `share/clus_apis.go` (`CLUSEventCondition`, `CLUSResponseRule`)

## Issues Found

1. **Incorrect DLP sensor endpoint.** The post used `/v1/dpi/dlp/sensor`, but the actual registered route is `/v1/dlp/sensor` (no `dpi/` prefix; see `controller/rest/rest.go` registration of `handlerDlpSensorCreate`). Changed.

2. **Incorrect admission criterion key for privileged containers.** The post used `"name": "privileged"`. The correct criterion key in NeuVector is `runAsPrivileged` (per `share/criteria.go`, `CriteriaKeyRunAsPrivileged`). Changed.

3. **Invalid admission criterion `noRequestLimit`.** This key does not exist in NeuVector's admission criteria (`share/criteria.go`). The closest real key, `resourceLimit` (`CriteriaKeyRequestLimit`), requires sub-criteria such as `cpuLimit`/`memoryLimit` with comparison operators — semantically very different from a simple boolean "no limit set" check. Replaced the rule with a `runAsRoot` rule, which is a valid criterion key and aligns with the post's existing claim "Non-root containers enforced: Enabled" in the Step 6 documentation generator.

4. **Incorrect operator string for CVE count comparison.** The post used `"op": "biggerEqualThan"` which is the Go constant *name* but not the wire-level value. The actual on-the-wire JSON value is `">="` (per `share/criteria.go`, `CriteriaOpBiggerEqualThan = ">="`). Changed.

5. **Missing `category` on admission rules.** Admission rule configs require a `category` field. Added `"category": "Kubernetes"` on the three admission rules in Step 3 to match the validated PCI DSS sibling post and source-code examples.

6. **Invalid `syslog_categories` values.** The post listed `"incident"` and `"violation"` in `syslog_categories`. Per `controller/rest/system.go` (around line 1451), syslog category validation only accepts `event`, `security-event`, and `audit`; `incident` and `violation` are merged into `security-event` for syslog and will be rejected with HTTP 400. Removed the two invalid entries.

7. **Incorrect response rule create method/body.** The post used `POST /v1/response/rule` with `{"config": {...}}`. There is no POST `/v1/response/rule` route; rules are created via `PATCH /v1/response/rule` with body `{"insert": {"rules": [...]}}` (per `RESTResponseRuleActionData`/`RESTResponseRuleInsert` in `controller/api/apis.go`). Updated method, URL note, and body shape. Each rule entry must be a full `RESTResponseRule` (id, event, comment, group, conditions, actions, webhooks, disable, cfg_type).

8. **Incorrect endpoint and field name for applying DLP sensors to a group.** The post applied DLP sensors via `PATCH /v1/group/{name}` with a `dlp_sensors` field. `RESTGroupConfig` has no `dlp_sensors` field. The correct endpoint is `PATCH /v1/dlp/group/{name}` with body `{"config": {"name": "...", "status": true, "sensors": [{"name":"...","action":"..."}]}}` (per `RESTDlpGroupConfig`). Changed URL, added required `name` and `status` fields, and renamed `dlp_sensors` to `sensors`.

9. **Incorrect workload scan list endpoint.** The post used `/v1/scan/workload?start=0&limit=1000`, which does not exist as a list endpoint (only `/v1/scan/workload/:id` exists for individual reports). The correct way to enumerate workloads with their CVE counts is `GET /v1/workload`, which returns workloads with an embedded `scan_summary` object. Updated the report script accordingly.

10. **Incorrect CVE field path in jq.** The original used `.workloads[].critical`. Critical CVE counts live at `.scan_summary.critical` (per `RESTScanBrief` JSON tags `critical`/`high`/`medium` in `controller/api/apis.go`). Updated the jq path to `.workloads[].scan_summary.critical`.

11. **Invalid `NvClusterSecurityRule` selector and ports schema.** The post used Kubernetes-style `selector.matchLabels` and `ports: [{protocol: TCP, port: 443}]`. NeuVector's `NvSecurityRuleDetail` defines `selector` as a `RESTCrdGroupConfig` (with `name` and `criteria`, not `matchLabels`) and `ports` as a string (e.g. `tcp/443`, `any`, `"80, 443"`); see `controller/resource/nvsecurityrule_def.go` and `controller/rest/policy.go:175`. Restructured each rule's selector to use NeuVector's `name` + `criteria` form, replaced the ports list with the string format, added the required `applications` field, and replaced the empty `selector: {}` for the default-deny rule with a reference to NeuVector's built-in reserved `external` group.

## Review Notes

- The DLP regex patterns in the post are reasonable starting points but make some questionable assumptions: the "EU phone numbers" pattern only covers UK (+44) and France (+33), and the "national-id" pattern only matches the UK NINO format. These are content gaps rather than technical errors and were left as-is. Readers building real GDPR DLP coverage should add patterns for German Personalausweis, Italian Codice Fiscale, Spanish DNI, etc.
- Detecting an IP address with a regex is approximate and will produce false positives; in a real deployment, structured log scrubbing is preferred.
- The post's mapping of GDPR articles to NeuVector capabilities is a reasonable summary but is not a substitute for legal review — Article 32 in particular has broader requirements than a container security tool can fully satisfy.
- The post uses NeuVector's REST API directly with `X-Auth-Token`. Token acquisition via `/v1/auth` is implied as a prerequisite — readers unfamiliar with NeuVector may need to consult the auth flow separately.
- The "external" reserved group in NeuVector represents endpoints outside the cluster. Using it for the default-deny rule blocks all egress to anywhere outside, which may be more restrictive than the reader intends; tuning may be needed for legitimate cloud-service egress beyond the EU allowlist.

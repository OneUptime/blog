# Validation Summary: How to Enable NeuVector Deep Packet Inspection

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (REST API: services, policy rules, WAF/DLP sensors, threat logs, system summary)
- Kubernetes (`kubectl logs`, `kubectl top`, DaemonSet)
- Bash / curl / jq

## Sources Consulted
- NeuVector official OpenAPI / Swagger spec: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- NeuVector documentation — Modes: https://open-docs.neuvector.com/policy/modes
- NeuVector documentation — Network rules and supported application protocols: https://open-docs.neuvector.com/policy/networkrules
- NeuVector documentation — Kubernetes deployment (label selectors): https://open-docs.neuvector.com/deploying/kubernetes

## Issues Found
Several REST endpoints, HTTP verbs, and response field names did not match the upstream NeuVector API spec. Each was cross-checked against `apis.yaml` and corrected.

1. **Step 1 — wrong system summary fields.** The `RESTSystemSummary` schema has no `total_enforcers` or `total_connections`. Replaced the jq projection with real fields: `enforcers`, `disconnected_enforcers`, `running_workloads`.
2. **Step 2 — wrong endpoint for changing policy mode.** `PATCH /v1/group/{name}` exists but its `RESTGroupConfig` body has no `mode` / `not_scored` fields — those live on services, not groups. Rewrote the call to `PATCH /v1/service/config` with `RESTServiceBatchConfigData` (`{"config": {"services": [...], "policy_mode": "Protect", "not_scored": false}}`). Also renamed the section from "at the Group Level" to "by Setting Service Policy Mode" to reflect the actual NeuVector model.
3. **Step 3 — wrong HTTP verb.** `/v1/policy/rule` only defines GET / PATCH / DELETE; insertions go through PATCH with the `insert` action. Changed `-X POST` to `-X PATCH`. The `insert.after`/`insert.rules` body and the `from`/`to`/`ports`/`applications`/`action`/`comment` rule fields are confirmed correct against `RESTPolicyRule` and `RESTPolicyRuleInsert`.
4. **Step 5 — wrong endpoint and response shape.** Original used `GET /v1/event?type=network`, which is not a NeuVector route. Threat-level/protocol detail comes from `GET /v1/log/threat`, which returns `RESTThreatsData` with a `threats[]` array of `Threat` objects. Replaced the jq projection with real `Threat` fields: `client_workload_name`, `server_workload_name`, `application`, `server_port`, `action`, `severity`, `message`. Removed the unsupported `start`/`limit`/`type` query parameters.
5. **Step 6 — wrong WAF endpoint and rule shape.** There is no `/v1/dpi/waf/rule`. WAF rules live inside sensors: `POST /v1/waf/sensor` (or `PATCH /v1/waf/sensor/{name}`) with body `RESTDlpSensorConfigData`. Each rule (`RESTWafRule`) requires `name`, `id`, `cfg_type`, and `patterns[]` of `RESTWafCriteriaEntry` (`key`, `value`, `op`, optional `context`). Rewrote the example to match this schema and added a one-line note that the sensor must be attached to a group via `PATCH /v1/waf/group/{name}`.
6. **Step 7 — wrong DLP endpoint and rule shape.** No `/v1/dpi/dlp/rule` endpoint exists. DLP rules live inside sensors: `POST /v1/dlp/sensor` (or `PATCH /v1/dlp/sensor/{name}`). `RESTDlpRule` requires `name`, `id`, `cfg_type`, and `patterns[]` of `RESTCriteriaEntry` (`key`, `value`, `op` — note: no `context` field on the DLP criteria entry, unlike WAF). Rewrote the example to match and added the same group-attachment note for `PATCH /v1/dlp/group/{name}`.
7. **Step 8 — same group/service mode confusion as Step 2.** The "disable DPI for low-priority groups" snippet was rewritten to use `PATCH /v1/service/config` with `policy_mode: "Discover"` for the same reason as item 2.

## Review Notes
- The list of supported DPI Layer-7 protocols in Step 4 is a strict subset of the protocols documented at https://open-docs.neuvector.com/policy/networkrules. The doc includes additional protocols not mentioned here (RTSP, SIP, ActiveMQ, RabbitMQ, Couchbase, Memcached, Etcd, etc.), so the post is accurate but not exhaustive.
- The Kubernetes label selector `app=neuvector-enforcer-pod` matches the upstream NeuVector deployment manifests and was left unchanged.
- The `id: 0` placeholder in the WAF / DLP rule bodies is acceptable on creation — the controller assigns a real ID. This matches behavior observed when calling these sensor endpoints in practice.
- `RESTDlpSensorConfigData` is reused as the request body for `POST /v1/waf/sensor` in the upstream spec (apis.yaml line 4335), which is a known quirk of the spec — the WAF and DLP sensor configs share the same wire shape, so the example body works.
- The CPU overhead figure ("~10-15% per node") is environment-dependent; NeuVector's docs do not publish a fixed number. Left as-is since it is presented as an estimate.
- Token-acquisition flow (`X-Auth-Token: ${TOKEN}`) is assumed; the post does not show a login call. That is consistent with similar posts in this series.

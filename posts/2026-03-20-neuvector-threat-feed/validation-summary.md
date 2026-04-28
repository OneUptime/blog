# Validation Summary: How to Configure NeuVector Threat Feed

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (REST API, address groups, network policy rules, system config)
- Kubernetes (CronJob, Secrets)
- AlienVault OTX (Open Threat Exchange) API
- STIX / TAXII 2.1 with the Python `stix2` library
- Bash, jq, curl, Python `requests`

## Sources Consulted
- NeuVector source repository: https://github.com/neuvector/neuvector
  - `controller/api/apis.go` (REST API config types, port defaults, group prefix constants, `cfg_type` constants)
  - `controller/rest/rest.go` (route table — confirmed `/v1/auth`, `/v1/system/config`, `/v1/policy/rule`, `/v1/group`, `/v1/log/event`)
  - `controller/rest/crdsecurityrule.go` (`nv.ip.` prefix reservation for learned/CRD service groups)
  - `controller/rest/group_test.go` (criteria shape for address groups)
  - `dp/ctrl.c` (`xff_enabled` semantics)
  - `CommandLines.md` (manager port 8443, controller REST port 10443)
- NeuVector apis.yaml OpenAPI spec (system config field validation)
- AlienVault OTX External API docs: https://otx.alienvault.com/api and the OTX-Python-SDK reference implementation
- Kubernetes CronJob spec: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Fictional `nv.ip.threat` built-in group.** Step 2 originally claimed "NeuVector maintains `nv.ip.threat` for known malicious IPs." NeuVector source confirms `nv.ip.` is a reserved prefix for auto-learned service groups (e.g., `nv.ip.<service>.<domain>`), not a threat-feed group, and users cannot create groups under that prefix. Rewrote Step 2 to clarify that the threat group is user-defined (the post creates such groups in Step 3), renamed the referenced group to `threat-blocklist`, and added a sentence explaining the `nv.` prefix reservation. Also changed the rule-creation request from `POST` to `PATCH` to match the actual `/v1/policy/rule` route handler.

2. **Wrong `cfg_type` value.** Three locations used `"cfg_type": "user"`, but the valid constant in NeuVector is `"user_created"` (`CfgTypeUserCreated` in `controller/api/apis.go`). All three occurrences (rule entries in Step 2 and the group-creation body in Step 3) updated to `"user_created"`.

3. **Incorrect AlienVault OTX endpoint.** Step 4 used `https://otx.alienvault.com/api/v1/indicators/export?types=IPv4`, which is not a real OTX endpoint, and parsed `.results[].indicator`, which does not match any OTX response shape. Replaced with the documented `/api/v1/pulses/subscribed?modified_since=...` endpoint and updated the jq filter to walk `.results[].indicators[] | select(.type=="IPv4") | .indicator`, which matches the actual OTX pulse object schema.

4. **Wrong event endpoint.** Step 6 queried `/v1/event`, but the NeuVector REST route is `/v1/log/event` (`controller/rest/rest.go`). Updated the URL.

## Review Notes
- The `monitor_service_mesh` and `xff_enabled` fields in `/v1/system/config` (Step 1) are valid `RESTSystemConfigConfig` fields, though "enabling threat detection" is a slight overstatement — `xff_enabled` toggles X-Forwarded-For parsing in the data path and `monitor_service_mesh` controls service-mesh sidecar monitoring. They are reasonable items to enable in this context but are not, on their own, "threat detection" knobs.
- The Step 7 Python script imports `IPv4Address` from `stix2` but never uses it; harmless, left as-is.
- Default ports (`8443` for the manager UI, `10443` for the controller REST API) are correct.
- The address-group criteria shape `{key: "address", value: <ip>, op: "="}` is correct for plain IP/CIDR groups.
- Future caveat: very large criteria arrays (the post caps at 500 entries) may run into per-group limits and request-size issues; in practice production deployments often shard threat lists across multiple groups or use external blocklist sync tooling. Worth flagging in a follow-up but not a correctness issue here.

# Validation Summary: How to Set Up NeuVector Zero Trust Mode

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NeuVector (open-source Kubernetes container security platform, formerly SUSE NeuVector)
- NeuVector REST API (v1)
- NeuVector CRDs (`NvSecurityRule`, `NvClusterSecurityRule` on `apiVersion: neuvector.com/v1`)
- Kubernetes (CRDs, namespaces, services)
- Bash / curl / jq for API automation
- YAML configuration

## Sources Consulted
- NeuVector Official Documentation - CRD reference: https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector Official Documentation - REST API and Automation: https://open-docs.neuvector.com/automation/automation/
- NeuVector Official Documentation - Modes (Discover/Monitor/Protect): https://open-docs.neuvector.com/policy/modes/
- NeuVector Official Documentation - Network Rules: https://open-docs.neuvector.com/policy/networkrules/
- NeuVector Official Documentation - Process Profile Rules: https://open-docs.neuvector.com/policy/processrules/
- NeuVector Official Documentation - Console / REST API server: https://open-docs.neuvector.com/configuration/console/
- NeuVector source code (`controller/api/apis.go`) for canonical struct definitions of `RESTPolicyRule`, `RESTPolicyRuleInsert`, `RESTResponseRule`, `RESTResponseRuleInsert`, `RESTServiceConfig`, `RESTServiceBatchConfig`, `RESTGroupBrief`, `RESTGroupConfig`, `RESTEventsData`: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector Swagger spec (`controller/api/apis.yaml`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector Helm CRD definition: https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml
- SUSE NeuVector 5.3 documentation - CRD reference: https://documentation.suse.com/cloudnative/security/5.3/en/usingcrd.html

## Issues Found

Several technical errors were corrected in the post:

1. **Step 3 - Default deny rule (`/v1/policy/rule`)**:
   - Wrong HTTP method: post used `POST`, but the NeuVector API uses `PATCH` for the `insert` action on this endpoint (per `RESTPolicyRuleActionData` and `apis.yaml`). Changed to `PATCH`.
   - Invalid `cfg_type` value: post used `"user"`, but the canonical constant is `CfgTypeUserCreated = "user_created"`. Changed to `"user_created"`.
   - Misleading `"after": 9999`: per the `RESTPolicyRuleInsert` schema, `after` is a rule ID (`+id` for "after rule id", `0` for "first", omitted for "last"). Removed it so the rule inserts last.
   - Replaced `"from": "any"` / `"to": "any"` with `"containers"` (the built-in NeuVector group representing all containers), since `from`/`to` must be valid group names. Added the required `applications` field.

2. **Step 4 - Process profile CRD (`NvSecurityRule`)**:
   - The CRD uses Kubernetes-style `selector.matchLabels`, which is not supported by NeuVector. Per the official CRD schema, the selector requires `name` plus `criteria` (an array of `key`/`op`/`value` triples). Rewrote the selector accordingly.
   - Removed duplicate `name: sh` / `name: bash` entries with explicit `/bin/...` paths, since NeuVector deny rules match by name and the path is optional for deny entries (and identical name/path pairs are redundant).

3. **Step 5 - Micro-segmentation CRD (`NvClusterSecurityRule`)**:
   - Same `matchLabels` issue as Step 4 in target, ingress, and egress selectors. Replaced with `name` + `criteria` form.
   - Wrong `ports` format: post used the Kubernetes-style list-of-objects (`- protocol: TCP, port: 8080`). NeuVector CRDs use a string in `protocol/port` form (e.g., `tcp/8080`, `udp/53`, `any`). Converted all port entries.
   - Empty `selector: {}` in the `deny-all-other-egress` rule is invalid. Replaced with the built-in `external` group selector.
   - Added `applications` to each rule, which is part of the network rule schema.

4. **Step 6 - Auto-quarantine response rule (`/v1/response/rule`)**:
   - Wrong HTTP method: post used `POST`. Per `RESTResponseRuleActionData`, creating a rule uses `PATCH` with an `insert.rules` body (not `config`). Changed method and restructured the body.
   - Wrong condition field name: each `CLUSEventCondition` uses `name` (not `type`). Changed `"type": "level"` to `"name": "level"`. Removed the second `"name": "process-violation"` condition since "process-violation" is not a valid value for the `name` condition (valid names include `level`, `cve_high`, `cve_high_with_fix`, etc.; matching event-name is implicit in the `event` field).
   - Added the required `group` field (`"containers"`) and `cfg_type: "user_created"`.

5. **Step 7 - Transition to Protect mode**:
   - Wrong endpoint and field for setting policy mode: post used `PATCH /v1/group/{name}` with `{"config": {"mode": "Monitor"}}`. The `RESTGroupConfig` struct does not have a `mode`/`policy_mode` field; group/service policy mode is set via `PATCH /v1/service/config` with `RESTServiceBatchConfig` (`{"config": {"services": [...], "policy_mode": "Monitor"}}`). Rewrote the script to call the correct endpoint with the correct payload.
   - Improved namespace filter: switched the jq filter from a fragile substring match (`.name | contains("." + $ns)`) to the canonical `domain` field, which is the namespace of a service group per `RESTGroupBrief`.

6. **Step 8 - Event monitoring**:
   - Wrong endpoint: post used `/v1/event`. The correct path is `/v1/log/event` per the Swagger spec. Removed the `?type=security` query parameter since the documented endpoint does not accept a `type` filter.
   - Adjusted the jq aggregation to use `name` and `level` fields, which are the standard fields on the `Event` payload.

## Review Notes

- The post uses `https://neuvector-manager:8443/...` as the API base URL. In NeuVector's reference deployment, port `8443` is the manager (web UI) and the controller's REST API is on port `10443` (`neuvector-svc-controller-api` in the Helm chart). Some deployments expose the API through the manager service on `8443`, so this was left as-is, but readers running the official Helm chart unchanged will likely need to substitute the controller API service and port `10443`.
- The query parameters `?start=0&limit=100` and `?start=0&limit=500` on `GET /v1/group` and `GET /v1/policy/rule` are not part of the documented API spec. They are silently ignored by the controller (the endpoints return all rules/groups), so the examples still work; left untouched.
- The post's broader workflow (Discover → Monitor → Protect with promote/learn/refine cycles, micro-segmentation, auto-quarantine response rules) accurately reflects NeuVector's recommended zero-trust adoption path.
- The `applications` field in network rules accepts either L7 application names (`HTTP`, `MySQL`, `PostgreSQL`, `DNS`, etc.) or `any`. The values added during validation (`HTTP`, `PostgreSQL`, `DNS`) are illustrative; readers should adjust to match their actual workloads.
- Process profile name matching is by basename; the deny entries (`sh`, `bash`, `curl`, etc.) will match those processes regardless of path. Adding explicit `/bin/sh` style entries is redundant but not harmful.

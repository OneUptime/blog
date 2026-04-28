# Validation Summary: How to Configure NeuVector Network Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector REST API (v1)
- NeuVector Manager (Network Activity view)
- Kubernetes
- curl
- jq
- bash scripting
- Mermaid (for diagram output)

## Sources Consulted
- NeuVector REST API source (router definitions): https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go
- NeuVector conversation handler implementation: https://github.com/neuvector/neuvector/blob/main/controller/rest/conver.go
- NeuVector policy handler implementation: https://github.com/neuvector/neuvector/blob/main/controller/rest/policy.go
- NeuVector REST API type definitions (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector REST API & Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector Network Rules docs: https://open-docs.neuvector.com/policy/networkrules/
- jq manual (gsub, contains, any, test): https://jqlang.github.io/jq/manual/

## Issues Found
1. **Wrong endpoint path `/v1/conversation/group`** — this endpoint does not exist in NeuVector. The actual route registered in `controller/rest/rest.go` is `GET /v1/conversation` (handled by `handlerConverList`). Replaced all six occurrences (Steps 3, 4, 5, 6, 7, 8) with `/v1/conversation`.

2. **Wrong endpoint path `/v1/conversation/group/${GROUP}`** — there is no group-scoped conversation endpoint. The closest real endpoint is `GET /v1/conversation/:from/:to` which requires both endpoints. Since the post's intent was "all connections involving a group", I changed the example to call `/v1/conversation` and filter with `jq --arg g … select(.from == $g or .to == $g)`.

3. **Wrong JSON field `policyAction`** — NeuVector's `RESTConversationReport` struct (apis.go:1141) uses snake_case: the JSON tag is `policy_action`. The post's `.policyAction` jq filter would silently return null. Replaced with `.policy_action` in Step 3, Step 5 (CSV export), and Step 6 (filter on allow rules).

4. **Wrong HTTP method for inserting policy rules** — the post used `POST /v1/policy/rule`. NeuVector registers `PATCH /v1/policy/rule` (`handlerPolicyRuleAction`) for insert/move/update operations; there is no POST handler on that path. Changed to `PATCH`.

5. **Invalid `cfg_type` value** — the post used `"cfg_type": "user"`. The valid constant in `controller/api/apis.go` is `CfgTypeUserCreated = "user_created"`. Changed to `"user_created"`.

6. **`.ports` is an array, not a string** — several jq snippets treated `.ports` as a string (e.g., `contains("4444")` against an array of strings would error in jq, and string-concatenation `"…|" + .ports + "…"` would fail because `.ports` is `[]string`). Updated:
   - The "unexpected ports" filter now uses `select(.ports // [] | any(test("4444|1337|31337")))`.
   - The CSV export joins ports with `(.ports // [] | join(","))` before `@csv`.
   - The Mermaid edge label uses `\((.ports // []) | join(","))`.
   - The policy-rule generator likewise joins `.ports` to a comma-separated string before reading via `@tsv`.

7. **jq `gsub` regex escaping** — the original `gsub("nv."; ""; "g")` treats `.` as a regex wildcard (matching any character) and uses a meaningless `"g"` flags arg (jq's `gsub` is already global). Tightened to `gsub("nv\\."; "")` to match the literal prefix.

## Review Notes
- The post uses host `neuvector-manager:8443` for REST API calls. NeuVector's REST API is officially exposed by the controller (commonly `neuvector-svc-controller:10443` in default Helm deployments); the manager on 8443 hosts the web UI which proxies the API in some configurations. This was left as-is because deployment topology varies and the post is illustrative. Readers running the snippets should adjust the host/port to match their cluster's REST API service.
- The `nv.ip.` external-IP group prefix and `nv.<service>.<namespace>` group naming used in Step 3/4 are consistent with NeuVector's learned-group naming conventions.
- The `"after": 0` semantics for `RESTPolicyRuleInsert` (insert at the top) match the field comment in `controller/api/apis.go`.
- Conceptual claims about the Network Activity view (real-time visualization, namespace/time/group filters, allow/block/alert actions, traffic volume) are consistent with NeuVector's published documentation and product behavior.

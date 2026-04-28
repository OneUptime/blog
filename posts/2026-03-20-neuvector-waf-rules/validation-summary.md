# Validation Summary: How to Set Up NeuVector WAF Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (SUSE Security) WAF
- NeuVector REST API (`/v1/waf/*`, `/v1/log/threat`)
- NeuVector CRDs (`NvSecurityRule`)
- Kubernetes (kubectl, services, namespaces)
- Deep Packet Inspection (DPI)

## Sources Consulted
- NeuVector official docs — DLP & WAF Sensors: https://open-docs.neuvector.com/policy/dlp/
- SUSE Rancher Cloud Native docs — DLP & WAF (5.4): https://documentation.suse.com/cloudnative/security/5.4/en/dlp.html
- NeuVector Helm chart CRD definitions (authoritative for CRD schema): https://raw.githubusercontent.com/neuvector/neuvector-helm/master/charts/crd/templates/crd.yaml
- NeuVector REST API spec (`controller/api/apis.yaml`, ~14k lines, authoritative for endpoints + payload schemas): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- SUSE blog — Web Application Firewall in Containers: https://www.suse.com/c/web-application-firewall/

## Issues Found

The post had a number of substantive errors against the actual NeuVector REST API and CRD schema. All were corrected:

1. **Wrong REST API base path.** The post used `/v1/dpi/waf/sensor` for sensor CRUD. The actual endpoints are under `/v1/waf/sensor`, `/v1/waf/group/{name}`, and `/v1/waf/rule` (confirmed in `controller/api/apis.yaml`, lines 4297–4503). Updated all four `curl` calls.

2. **Wrong list response field.** `jq '.waf_sensors[].name'` was changed to `jq '.sensors[].name'` to match the `RESTWafSensorsData` schema (`sensors:` is the array field).

3. **Wrong `key` value in pattern objects.** The post used `"key": "request"`. The CRD enum and the API example both restrict `key` to `"pattern"`. Updated all 11 pattern entries.

4. **Wrong `context` value.** The post used `"context": "uri"`. Valid contexts per the `NvWafSecurityRule` CRD enum are `url`, `header`, `body`, `packet`. Replaced every `"uri"` with `"url"`.

5. **Spurious `name` field on patterns.** The post added a `"name": "..."` to each pattern object. Patterns have no `name` field in the CRD or REST schema (only the parent rule does). Removed all eight occurrences.

6. **Wrong endpoint and payload for applying sensors to a group.** The post `PATCH`ed `/v1/group/nv.webapp.default` with a `waf_sensors` field. The correct endpoint is `PATCH /v1/waf/group/{name}` (`RESTWafGroupConfigData` schema), and the field is `sensors` inside `config`, plus the required `name` and `status` fields. Rewrote the request body.

7. **Invalid `action` value.** The post used `"action": "block"` in API calls and CRDs, and described "Alert or Block" in the UI. The CRD enum is `allow | deny`; the REST API example value is `deny`. Replaced all `block` actions with `deny`, and updated the UI step to "Alert or Deny".

8. **Wrong events endpoint.** The post used `/v1/event?type=waf&start=0&limit=50`. WAF detections are reported as threats; the correct endpoint is `GET /v1/log/threat` (returns `RESTThreatsData`). Rewrote the `jq` projection to use real fields from the threat schema (`name`, `server_workload_name`, `client_workload_name`, `client_ip`, `sensor`, `group`, `action`, `severity`, `reported_at`).

9. **Invalid CRD selector.** The post used `selector.matchLabels: { app: webapp }`, which is Kubernetes label-selector syntax that does not exist on `NvSecurityRule`. The CRD requires `selector.name` (string, required) and supports `selector.criteria` (list of `{key, op, value}`). Rewrote the selector accordingly.

10. **Wrong CRD WAF block.** The post nested sensors under `waf.waf:`. The CRD field is `waf.settings:` (confirmed at line 314 of `crd.yaml`). Renamed and switched the actions to `deny`.

## Review Notes

- Kept the post's predefined regex patterns even though some are loose (e.g. the `path-traversal` pattern `\.\./|\.\.` will match any string containing two dots, generating false positives). They are illustrative and within the scope of "custom WAF rules" examples; tightening them is editorial, not a correctness fix.
- The Step 7 test for SQL injection (`?q=SELECT+*+FROM+users`) decodes URL-side to `SELECT * FROM users`, which matches the regex `\bselect\b.+\bfrom\b` once NeuVector decodes the URL — kept as-is.
- The post says "Filter by type: WAF" in the UI — the actual NeuVector UI filter is by category and the WAF detections appear under Security Events with sensor metadata; this is a UI description rather than a literal field name and was left unchanged.
- The `key: pattern` and `op: regex|!regex` enums are the only values accepted by the CRD. Authors writing future WAF posts should treat any other value as invalid even though the REST API may accept them silently.

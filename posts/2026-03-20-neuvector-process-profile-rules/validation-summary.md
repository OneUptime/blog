# Validation Summary: How to Set Up NeuVector Process Profile Rules

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (runtime container security)
- NeuVector REST API (`/v1/process_profile`, `/v1/log/incident`)
- NeuVector NvSecurityRule CRD (`neuvector.com/v1`)
- Kubernetes (kubectl, namespaces, init containers)
- jq for JSON processing
- curl for REST API calls

## Sources Consulted
- [NeuVector Process Profile Rules docs](https://open-docs.neuvector.com/policy/processrules/)
- [NeuVector CRD docs](https://open-docs.neuvector.com/policy/usingcrd/)
- [NeuVector REST API spec (apis.yaml on GitHub)](https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml)
- [NeuVector Helm CRD definition](https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml)
- [Manage NeuVector Using REST API (HackMD)](https://hackmd.io/@QI-AN/Manage-SUSE-NeuVector-Using-REST-API)
- [NvSecurityRule CRD example (devseclabs/nv-deployment)](https://github.com/devseclabs/nv-deployment/blob/main/crd/test-rules.yml)

## Issues Found

1. **Wrong process profile API path** — the post used `/v1/process/profile/group/<name>`. NeuVector's actual REST API uses `/v1/process_profile/{name}` (single path segment with underscore). Fixed across Steps 1, 3, and 8.

2. **Wrong HTTP method and request body for adding processes** — the post used `POST` to a non-existent `/v1/process/profile/group/.../process` endpoint with body `{"process": {...}}`. The real API uses `PATCH /v1/process_profile/{name}` with the `RESTProcessProfileConfigData` schema:
   ```json
   {"process_profile_config": {"group": "...", "process_change_list": [...]}}
   ```
   Fixed in Step 3 (both example calls).

3. **Wrong events endpoint** — the post used `/v1/event?type=process&start=0&limit=...`. There is no `/v1/event` endpoint and no `type`/`start`/`limit` query parameters on the log endpoints. NeuVector exposes `/v1/log/event`, `/v1/log/incident`, `/v1/log/security`, `/v1/log/threat`, and `/v1/log/violation`. Process profile violations are reported as incidents, so I switched Steps 6 and 7 to `/v1/log/incident` (which returns an `incidents` array per the OpenAPI schema).

4. **Wrong CRD selector format** — Steps 4 and 5 used Kubernetes-style `selector: matchLabels: {app: nginx}`. The `NvSecurityRule` CRD schema does not include `matchLabels`. Per the official schema, `target.selector` requires a `name` field (following `nv.SERVICE_NAME.DOMAIN`) plus `criteria` entries with `key`, `op`, `value`. Replaced with the correct selector form in both YAML examples.

5. **Step 5 framing about init containers** — the original step claimed shell could be allowed "only for init container context." NeuVector's process profile is per-group and cannot be scoped to init containers vs. main containers within the same pod, so the comment was misleading. Reworded the step (and the inline comment) to describe it as allowing startup-time processes generally, while keeping the same practical guidance.

## Review Notes
- The metadata `name` of an `NvSecurityRule` is conventionally the group name (e.g., `nv.nginx.default`); I aligned the examples with that convention since the selector now requires that exact name.
- The schema validates `process[].action` as `allow` or `deny` only; `monitor`-style actions are not part of the CRD process schema, so the current allow/deny examples are correct.
- The post mentions "Discover mode for 24-48 hours" as a prerequisite — official docs simply recommend a sufficient learning period; the specific window is a reasonable rule of thumb and was left unchanged.
- The UI navigation (`Policy > Groups > Process Profile`) and the conceptual mode names (Discover, Monitor, Protect) match current NeuVector documentation.

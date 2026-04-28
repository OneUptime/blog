# Validation Summary: How to Set Up NeuVector Container Quarantine

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (open-source container security platform)
- NeuVector REST API (v1) — response rules, workload config, event log
- Kubernetes (`kubectl exec`, `kubectl cp`, `kubectl set image`, `kubectl delete pod`)
- Docker (image build/push)
- Bash / curl / jq for API automation

## Sources Consulted
- NeuVector source — REST API struct definitions (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go
- NeuVector source — REST endpoint handlers and response rule validator (`controller/rest/response.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/response.go
- NeuVector source — shared event/action/condition constants (`share/types.go`): https://github.com/neuvector/neuvector/blob/main/share/types.go
- NeuVector OpenAPI / Swagger spec (`controller/api/apis.yaml`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector official documentation — Response Rules: https://open-docs.neuvector.com/policy/responserule
- NeuVector official documentation — REST API and Automation: https://open-docs.neuvector.com/automation/automation/
- Cross-checked against the validated `2026-03-20-neuvector-response-rules` and `2026-03-20-neuvector-export-security-events` posts in this repo.

## Issues Found

Two technical errors were corrected. Both involved REST endpoints / payloads that do not exist or are not accepted by the NeuVector controller — verified against `apis.go`, `apis.yaml`, and the response rule validator in `controller/rest/response.go`.

1. **Step 3 — wrong event log endpoint and query parameter.**
   The original used `GET /v1/event?type=security&start=0&limit=100`. NeuVector exposes events at `GET /v1/log/event` (not `/v1/event`), and the schema field is `category`, not `type` (this is the same fix applied to the validated `neuvector-export-security-events` post). Updated the URL to `/v1/log/event?category=security&start=0&limit=100`. The `.events[] | select(.workload_id == $id)` jq filter was already correct — `workload_id` is a real field on the `Event` schema (`apis.yaml`).

2. **Step 4 — invalid response rule event type and meaningless name condition.**
   The original used `event: "incident"` with a `name` condition matching `"quarantine"`. The `validateResponseRule` function in `controller/rest/response.go` rejects any `event` that is not in the active `responseRuleOptions` map; the active keys are `event`, `cve-report`, `security-event`, `serverless`, `compliance`, and `admission-control`. `incident` is defined as a constant in `share/types.go` but is commented out of the runtime options map, so this rule would fail validation. In addition, `quarantine` is an action taken in response to events, not the name of a NeuVector event — so even if `incident` were accepted, no event would match `name == "quarantine"`. Rewrote the rule to fire on `security-event` with a `level: "critical"` condition (the NeuVector pattern for getting webhook coverage of the events that typically trigger quarantine) and added a brief inline comment noting that NeuVector does not emit a separate quarantine event.

## Review Notes

- The `PATCH /v1/workload/{id}` body `{"config": {"quarantine": true|false}}` is correct: `RESTWorkloadConfigCfg` (`apis.go` ~lines 1394–1397) exposes only `wire` and `quarantine *bool`. The read-only `quarantine_reason` lives on the GET response struct (`RESTWorkloadConfig`) and is not settable on the PATCH side, so the post correctly omits it.
- Response rule actions used in the post — `quarantine` and `webhook` — are both valid (`share/types.go` lines 195–199). The third valid action is `suppress-log` (not bare `suppress`); this post does not use suppression, so no change was needed.
- Response rule condition types `name` and `level` are both valid (`share/types.go` lines 180–193) and gated to `security-event` / `event` / `cve-report` per `responseRuleOptions`.
- Step 1's `cfg_type: "user"` is consistent with the validated `neuvector-response-rules` post (NeuVector accepts `user`, `learned`, `ground`, `federal` for `CfgType`).
- The post uses `https://neuvector-manager:8443/...` as the API base URL. Port 8443 is the manager (web UI) and the controller's REST API is on port 10443 (`neuvector-svc-controller-api`) in the reference Helm chart. Some deployments expose the API through the manager on 8443, so this was left as-is, consistent with how prior validated NeuVector posts in this repo handle it.
- `GET /v1/workload?brief=true` is implemented in the controller (`BriefFlag` constant at `apis.go:82`, `RESTWorkloadsBriefData` struct), even though the OpenAPI spec does not formally document the parameter. Left untouched.
- Step 5 / Step 6 use `?start=0&limit=N` on `GET /v1/workload`. These are not enumerated in the upstream Swagger but are accepted (and silently ignored when not relevant) by the controller; left untouched, matching prior validated posts.
- The UI navigation `Assets > Containers` and the Quarantine button (lock icon) reflect the current NeuVector Manager UI layout.
- The condition value `"reverse-shell"` matches the pattern used in the validated `neuvector-response-rules` post and is accepted by NeuVector for matching threat names.
- The `kubectl exec`/`kubectl cp` forensic capture sequence in Step 3 is a sensible pattern; note that quarantine only blocks network traffic, so process-level access via `kubectl exec` continues to work.
- The `docker build … --build-arg BASE_IMAGE=nginx:latest-patched` example in Step 8 uses a placeholder tag (`nginx:latest-patched` is not a real upstream nginx tag); this is appropriate for a tutorial illustrating the build argument flow.
- Specific NeuVector versions are not pinned in the post; the API surface used here is stable across recent NeuVector 5.x releases.

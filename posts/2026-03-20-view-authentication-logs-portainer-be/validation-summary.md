# Validation Summary: How to Access Authentication Logs in Portainer Business Edition

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition (2.x)
- Portainer HTTP API (`/api/useractivity/authlogs`)
- `curl` and `jq` for CLI scripting
- Bash scripting
- Splunk HTTP Event Collector (SIEM integration)
- Docker (`docker logs` streaming)

## Sources Consulted
- Portainer admin docs — Authentication logs: https://docs.portainer.io/admin/logs/authentication
- Portainer admin docs — Activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer SIEM integration docs: https://docs.portainer.io/advanced/siem
- Portainer Terraform provider (authoritative public reference for response shape): https://github.com/portainer/terraform-provider-portainer/blob/main/internal/data_source_user_activity.go
- `portainerctl` admin commands: https://github.com/portainer/portainerctl/blob/master/cmd/admin.go
- Portainer `AuthenticationMethod` enum (Go): https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer auth-type constants (JS): `app/portainer/settings/authentication/auth-type-constants.js` in `portainer/portainer`
- Portainer user-activity REST stub: `app/portainer/user-activity/user-activity.rest.js` in `portainer/portainer`

## Issues Found
Several significant technical errors were present and have been corrected:

1. **Wrong UI navigation path.** The post claimed logs were under `Settings > Authentication logs`. The actual path is a top-level sidebar section: `Logs > Authentication`. Fixed the instructions.
2. **Wrong API endpoint.** The post used `/api/auth/logs`, which does not exist. Replaced with the real endpoint `/api/useractivity/authlogs` throughout all curl examples (including the brute-force and SIEM sections).
3. **Wrong JSON field names.** The post used `.Timestamp`, `.Username`, `.Result`, `.SourceIPAddress` (TitleCase). The actual response uses lowercase: `timestamp`, `username`, `type`, `origin`. All `jq` expressions were rewritten.
4. **Wrong field semantics for status.** `.Result == "failure"` does not exist. The actual `type` field is an integer enum (`1` = success, `2` = failure, `3` = logout). All selectors were changed to `select(.type == 2)` and an explanatory paragraph was added documenting the `type` and `context` enums.
5. **Non-existent "Reason" field.** The post described a `Reason` column/field for failures. The auth log entry has no failure-reason field at all. Removed from the "What's Shown in the Log" section.
6. **Invalid login-context values.** The post listed `form, OAuth, LDAP, API token` as auth context values. The real `context` enum only has `1=internal, 2=LDAP, 3=OAuth`. Corrected the bullet.
7. **Fabricated retention UI setting.** The post claimed retention was configurable at `Settings > Security > Authentication log retention`. No such setting exists in Portainer BE. Replaced that section with accurate guidance: CSV export via UI, programmatic export via the API with `before`/`after` query params, and a pointer to Portainer's SIEM syslog streaming (BE 2.20+).
8. **Wrong query parameter for time range.** The SIEM snippet used `?since=…`. The real API accepts `?after=…` (and `?before=…`) with Unix timestamps. Fixed the Splunk-forwarding snippet.
9. **Overview bullets.** Removed unsupported claims about distinct log entries for "Session expirations"; these are not a recorded `type` in the auth-log schema. "Token-based authentication" as a separate category was also removed (API-token auth is not a distinct context enum value).
10. **Auth header.** Swapped `Authorization: Bearer` for `X-API-Key`, which is the documented header for Portainer's long-lived admin API keys used by automation/CLI tooling.

## Review Notes
- The `type` and `context` fields are integers. If a future reader needs human-readable labels (e.g., for dashboards), they should map them client-side — Portainer does not return string labels.
- The `GET /api/useractivity/authlogs` response is a raw JSON array, while the sibling `/api/useractivity/logs` (activity logs) is wrapped in `{logs, totalCount}`. The jq snippets here rely on the raw-array shape specific to authlogs — they would need `.logs[]` if reused against the activity endpoint.
- Bearer-token auth (from a login-obtained JWT) also works against the API, but `X-API-Key` is the recommended pattern for service accounts and long-lived automation.
- The `docker logs -f portainer` real-time monitoring pattern works but is best-effort: log line formats are not a stable API and may change between Portainer releases.
- Portainer BE's dedicated SIEM/syslog streaming (2.20+) is the most reliable long-term retention approach for compliance-driven environments; the curl-based export loop is a reasonable fallback where syslog isn't available.

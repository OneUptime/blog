# Validation Summary: How to View Authentication Logs in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Bash
- `jq`
- AWS CLI (`aws s3 cp`)
- Syslog / SIEM log streaming

## Sources Consulted
- Portainer docs, Logs overview: https://docs.portainer.io/admin/logs
- Portainer docs, Authentication logs UI: https://docs.portainer.io/admin/logs/authentication
- Portainer docs, Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer docs, API documentation index: https://docs.portainer.io/api/docs
- Portainer BE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer docs, Stream auth and activity logs to an external provider: https://docs.portainer.io/sts/advanced/siem
- Portainer source, authentication log columns and event enums: https://github.com/portainer/portainer/blob/develop/app/react/portainer/logs/AuthenticationLogsView/columns.tsx
- Portainer source, authentication log types/context values: https://github.com/portainer/portainer/blob/develop/app/react/portainer/logs/AuthenticationLogsView/types.ts
- Portainer source, authentication log UI retention note: https://github.com/portainer/portainer/blob/develop/app/portainer/user-activity/auth-logs-view/auth-logs-view.html

## Issues Found
- The UI navigation path was wrong. The post said `Settings` -> `Authentication logs`; Portainer documents authentication logs under `Logs` -> `Authentication`. I corrected the navigation steps and the column descriptions to match the documented UI and current frontend implementation.
- The listed authentication event types were inaccurate. The post included unsupported entries such as `LOGIN_UNKNOWN`, `SESSION_EXPIRED`, and `API_KEY_ACCESS`. I replaced them with the current documented/authenticated model used by Portainer BE: `type` values for success, failure, and logout, plus `context` values for internal, LDAP, and OAuth authentication.
- The API examples used the wrong endpoint and data model. The post referenced `/api/auth/logs`, but the published BE OpenAPI spec exposes `/api/useractivity/authlogs` and `/api/useractivity/authlogs.csv`. I updated the endpoint paths, authentication header usage, and JSON field names from mixed-case/string fields like `.Type` and `.IP` to the current lowercase/numeric schema (`.type`, `.origin`, `.timestamp`, `.username`, `.context`).
- The shell examples had correctness issues beyond the endpoint mismatch. I fixed unquoted JSON variable expansion (`echo $LOGS` -> `echo "$LOGS"`), updated `jq` selectors to the actual schema, and corrected the after-hours comparison logic to include 18:00 and later as after-hours.
- The monthly export script was incorrect. It used the wrong endpoint, mislabeled the reporting period, and could miss data due to lack of pagination. I replaced it with a working export flow for the real auth log API, corrected the previous-month UTC range calculation, and added pagination using `limit` and `offset`.
- The retention guidance was wrong. The post described configurable UI retention settings that do not match current Portainer behavior. I replaced that section with the current maximum retention of 7 days and pointed longer-term retention toward export or external SIEM streaming.

## Review Notes
- The revised shell snippets use GNU `date` syntax (`date -d`), which is appropriate for typical Linux hosts running Portainer but is not portable to BSD/macOS `date` without adjustment.
- Portainer's BE OpenAPI spec allows either `X-API-KEY` or `Authorization` authentication headers. The post now uses `X-API-Key` to align with Portainer's API access token documentation.
- Portainer's SIEM streaming docs currently document the feature, but the main post no longer hardcodes those CLI flags because the feature is only referenced as a retention option, not as a step-by-step setup example.

# Validation Summary: How to Audit User Activity in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Docker
- Bash
- `curl`
- `jq`
- Syslog / SIEM forwarding

## Sources Consulted
- Portainer docs: Logs overview: https://docs.portainer.io/admin/logs
- Portainer docs: Authentication logs: https://docs.portainer.io/admin/logs/authentication
- Portainer docs: Activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer docs: API documentation index: https://docs.portainer.io/api/docs
- Portainer API spec (BE 2.39.1): https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer docs: API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer docs: Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer docs: Stream auth and activity logs to an external provider: https://docs.portainer.io/advanced/siem
- Portainer docs: CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer docs: Install Portainer BE with Docker on Windows Container Service: https://docs.portainer.io/start/install/server/docker/wcs

## Issues Found
- The UI navigation was incorrect. The post said to use `Settings > Authentication logs` or `Logs`, but current Portainer docs place these under `Logs > Authentication` and `Logs > Activity`. I corrected the navigation path.
- The example log-entry JSON did not match Portainer’s documented API schema. It used fields such as `userRole`, `resourceType`, `resourceId`, and `result` that are not part of the published log response shapes. I replaced it with an authentication log example that matches the official API fields and clarified the documented activity-log fields.
- The API endpoints were incorrect. The post used `/api/auth/logs` and `/api/logs`, but the published BE API exposes `/api/useractivity/authlogs`, `/api/useractivity/authlogs.csv`, `/api/useractivity/logs`, and `/api/useractivity/logs.csv`. I updated the commands accordingly.
- The API header choice was a poor fit for the automation example. The post used a bearer token in a weekly report script, while Portainer documents user access tokens via `X-API-Key` and JWT bearer tokens are short-lived. I changed the examples to use `X-API-Key` consistently.
- The filtering examples used unsupported query parameters such as `since` and `role`. The official API documents `after`, `before`, `keyword`, `username`, `context`, `offset`, and `limit` for these endpoints. I rewrote the examples to use supported parameters.
- The JSON processing in the weekly report script was incorrect for the activity-log response shape. `/api/useractivity/logs` returns an object containing `logs` and `totalCount`, not a top-level array. I updated the `jq` query to read from `.logs[]`.
- The failed-login example checked `result == "failure"`, but the published auth-log schema exposes a numeric `type` field. I updated the example to count `type == 2`, which the API schema identifies as authentication failure.
- The external forwarding example was technically wrong. It configured Docker’s container log driver, which does not implement Portainer’s documented authentication/activity log streaming feature. I replaced it with the official Portainer `--syslog-*` CLI flags and corrected the image reference to the documented Business Edition image.

## Review Notes
- Portainer’s documentation describes auth/activity log streaming to SIEM as an experimental feature and notes it is available in Portainer 2.20 and later.
- The UI guidance was checked against the current docs pages available on May 1, 2026. The API endpoint and schema validation was checked against the latest published BE API spec linked from the docs at review time.
- The edited weekly-report shell snippet was sanity-checked locally with `bash -n`, and the updated `jq` filters were parsed against sample JSON payloads.

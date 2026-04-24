# Validation Summary: How to View Authentication Logs in Portainer Business

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer authentication logs
- Portainer HTTP API
- `curl`
- `jq`
- OneUptime API monitors

## Sources Consulted
- Portainer logs overview: https://docs.portainer.io/admin/logs
- Portainer authentication logs: https://docs.portainer.io/admin/logs/authentication
- Portainer activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer API access: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer Business Edition API spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Business Edition API spec 2.40.0: https://api-docs.portainer.io/versions/ee/2.40.0.yaml
- Portainer external SIEM streaming: https://docs.portainer.io/advanced/siem
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- OneUptime API monitor documentation: https://oneuptime.com/docs/monitor/api-monitor

## Issues Found
- The UI navigation was incorrect. The post said `Settings > Logs`, but Portainer documents authentication logs under `Logs > Authentication`. I corrected the path.
- The post overstated what authentication logs contain. Claims about API token usage, OAuth flow records, session expiry, password changes, failure reasons, and accessed endpoints were not supported by Portainer's authentication log documentation or API schema. I replaced that section with the documented fields and supported event types.
- The API endpoint examples were wrong. The draft used `/api/logs/auth`, but Portainer's published Business Edition API documents `/api/useractivity/authlogs` and `/api/useractivity/authlogs.csv`. I updated the commands to use the documented endpoints.
- The JSON shape in the examples was wrong. The draft expected `.logs[]` objects with fields like `.ip` and `.action`, while the documented auth-log response is an array of objects with fields such as `username`, `origin`, `context`, `type`, and `timestamp`. I rewrote the `jq` filters accordingly.
- The retention guidance was inaccurate. Portainer's docs do not document a UI retention setting under `Settings > General` for authentication logs. I replaced that section with accurate guidance: UI viewing/filter/export is documented, and longer retention is handled through external SIEM streaming via startup flags.
- The OneUptime example referenced the wrong Portainer endpoint. I updated it to the documented auth-log endpoint and aligned the monitor guidance with OneUptime's documented API monitor capabilities.

## Review Notes
- The shell examples use GNU `date` syntax (`date -d`), which is standard on Linux systems but differs on macOS.
- The examples use HTTPS on port `9443` with `curl -k`, which is appropriate for default/self-signed Portainer deployments. Environments with trusted certificates can omit `-k`.

# Validation Summary: How to Run Gotify in Docker for Push Notifications

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Gotify server and Android client
- Docker and Docker Compose
- Gotify REST API
- Shell scripting with curl
- Nginx and Traefik reverse proxies
- Cron

## Sources Consulted
- Gotify Installation documentation: https://gotify.net/docs/install
- Gotify Configuration documentation: https://gotify.net/docs/config
- Gotify First Login documentation: https://gotify.net/docs/first-login
- Gotify Push Messages documentation: https://gotify.net/docs/pushmsg
- Gotify REST API documentation and OpenAPI spec: https://gotify.net/api-docs and https://raw.githubusercontent.com/gotify/server/v2.9.1/docs/spec.json
- Gotify Nginx reverse proxy documentation: https://gotify.net/docs/nginx
- Gotify Traefik reverse proxy documentation: https://gotify.net/docs/traefik
- Gotify Android README: https://github.com/gotify/android
- Docker Compose documentation: https://docs.docker.com/compose/
- Docker Compose file reference for version/name: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the snippet matches the current Compose Specification.
- The Android notification priority descriptions were inaccurate for priority 0 and priorities 8-10. Updated them to match the Gotify Android priority table: priority 0 has no Android notification, 1-3 shows an icon, 4-7 adds sound, and 8-10 adds sound and vibration.
- The iOS/browser sentence implied background browser push support. Updated it to say the web interface can show browser notifications while the web UI is open on supported browsers.
- The Nginx reverse proxy snippet omitted documented WebSocket proxy settings, including `proxy_http_version 1.1`, forwarded headers, preserving `Host` as `$http_host`, and WebSocket-friendly timeouts. Added those settings to align with Gotify's Nginx documentation.

## Review Notes
- The Gotify Docker image, `/app/data` volume path, `TZ` environment variable, default user environment variables, `/health` endpoint, message creation endpoint, application creation endpoint, and message deletion endpoints were verified against official Gotify documentation and the current OpenAPI spec.
- The shell examples work for the shown values. For production scripts that pass arbitrary user-controlled strings, JSON payloads should be encoded with a JSON-aware tool or sent as form fields to avoid quoting issues.

# Validation Summary: How to Fix Tab Switching Causing Long Reloads in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API
- Google Chrome
- Mozilla Firefox
- NGINX
- HTTP/2
- JavaScript

## Sources Consulted
- Portainer Authentication settings: https://docs.portainer.io/admin/settings/authentication
- Portainer General settings: https://docs.portainer.io/admin/settings/general
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer database documentation: https://docs.portainer.io/advanced/db-encryption
- Portainer source, JWT expiry handling: https://github.com/portainer/portainer/blob/2.39.1/api/jwt/jwt.go
- Portainer source, status endpoint handler: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/system/status.go
- Portainer source, status route registration: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/system/handler.go
- Portainer source, Docker stack routes: https://github.com/portainer/portainer/blob/2.39.1/app/docker/__module.js
- Google Chrome Help, Performance / Memory Saver: https://support.google.com/chrome/answer/12929150
- Mozilla Support, tab unloading in Firefox: https://support.mozilla.org/en-US/kb/unload-inactive-tabs-save-system-memory-firefox
- Firefox Source Docs, tab unloading: https://firefox-source-docs.mozilla.org/browser/tabunloader/
- NGINX HTTP/2 module docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Docker CLI docs for container filters: https://docs.docker.com/reference/cli/docker/container/ls

## Issues Found
- The Chrome instructions were outdated. The post referenced `chrome://flags` and automatic tab discarding, but current Chrome exposes this through **Settings → Performance → Memory Saver** and supports per-site exclusions. I updated the steps accordingly and removed the extension recommendation.
- The Firefox section incorrectly suggested changing `privacy.reduceTimerPrecision` to disable background tab throttling. That preference is unrelated to tab unloading. I removed it and kept the documented `browser.tabs.unloadOnLowMemory` guidance, plus `about:unloads` for diagnosis.
- The session-timeout explanation was inaccurate. Portainer documents session lifetime as a configurable duration with an 8-hour default, and the current source issues JWTs with a fixed expiry. I changed the wording from “period of inactivity” to an 8-hour session lifetime.
- The keepalive section was technically wrong. Portainer’s `/api/status` endpoint is deprecated in current source, the replacement is `/api/system/status`, and polling it does not extend JWT expiry or prevent browser tab deactivation because the endpoint is public and the JWT has a fixed expiration. I converted this step into a diagnostic-only poll and corrected the endpoint.
- The snapshot interval section overstated what snapshots do and used an invalid flag value. Portainer documents snapshots as periodic environment snapshot jobs, not per-navigation reload behavior, and `--snapshot-interval` expects a duration string such as `10m`, not `300`. I corrected both the explanation and the example.
- The Chrome memory-limit suggestion used `--max_old_space_size`, which is a V8/Node-style flag and not valid guidance for Chrome tab reload behavior. I removed it.
- The API response-size section implied this changes Portainer UI behavior. The filtered Docker API calls are valid for diagnosis, but they do not reconfigure the built-in UI. I clarified that limitation.
- The NGINX HTTP/2 example used deprecated syntax. Current NGINX documentation prefers `listen 443 ssl;` with `http2 on;`. I updated the snippet.
- The bookmark examples were inaccurate. The original examples used unsupported or incomplete UI routes for a filtered containers view and a stack detail view. I replaced them with stable list-view URLs that match the current Portainer route structure.
- The final section incorrectly framed the problem as database-query performance. Portainer documents its configuration store as BoltDB, and the provided command only inspects container logs, not query timings. I changed the section to log inspection and updated the grep targets to relevant warning/error patterns.
- The Step 2 note saying session lifetime was not configurable by API was incorrect. Current Portainer source exposes `UserSessionTimeout` on settings update handling. I corrected that note.

## Review Notes
- The post still uses `portainer/portainer-ce:latest` in `docker run` examples. This is technically valid, but pinning to a specific release or `lts` tag would be safer for reproducibility in a future revision.
- The API examples use `http://localhost:9000`, which Portainer still documents as legacy HTTP. A future revision could prefer HTTPS on `9443` for production-facing examples.

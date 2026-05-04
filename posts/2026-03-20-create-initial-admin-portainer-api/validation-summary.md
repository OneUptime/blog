# Validation Summary: How to Create the Initial Admin User via the Portainer API

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer CE (2.x) REST API
- `curl` for HTTP requests
- `jq` for JSON parsing
- Bash scripting
- Docker Compose

## Sources Consulted
- Portainer source (v2.41.0): `api/http/handler/users/admin_init.go` — admin init handler and payload schema
- Portainer source: `api/http/server.go:143` and `api/adminmonitor/admin_monitor.go` — 5-minute init window
- Portainer source: `api/datastore/init.go` and `api/http/security/passwordStrengthCheck.go` — minimum password length (12)
- Portainer source: `api/http/handler/system/status.go` and `handler.go` — `/api/system/status` endpoint
- Portainer source: `api/http/handler/settings/settings_update.go` — settings PUT payload schema
- Portainer source: `build/linux/Dockerfile` — `FROM portainer/base` (scratch-based)
- Portainer API docs: https://docs.portainer.io/api/docs

## Issues Found

1. **`/api/users/admin/init` does not return a JWT.** The post claimed the response was `{"jwt": "..."}` and the script piped it through `jq -r '.jwt'`. The handler actually responds with the created `User` object (`response.JSON(w, user)` in `admin_init.go:82`). To obtain a JWT, a separate `POST /api/auth` call is required. Fixed by:
   - Updating the example response to show the User object
   - Adding a follow-up `/api/auth` example
   - Restructuring the script to call `/api/auth` after init to obtain the JWT

2. **`enableTelemetry` is not a valid settings field.** No `Telemetry` field exists in `settingsUpdatePayload`. Removed it from the PUT body in the script.

3. **`authenticationMethod` casing.** The Portainer settings payload uses `AuthenticationMethod` (PascalCase), matching the Go struct field name. Corrected.

4. **Docker Compose `HEALTHCHECK` with `curl` cannot work.** `portainer/portainer-ce` is built `FROM portainer/base`, which is `FROM scratch` — no shell, no `curl`, no `wget`, no busybox. The `["CMD", "curl", "-f", ...]` test would always fail to exec. Fixed by removing the healthcheck from the Portainer service and moving the readiness poll into the init container itself (`until curl -sf ...; do sleep 2; done`). Added a short note explaining why.

5. **Compose-time vs runtime variable interpolation in the init container's `command:`.** Original used `${ADMIN_PASS}`, which Compose interpolates from the host environment at deploy time. Since `ADMIN_PASS` is only meaningfully set inside the container (via `environment:`), this should be `$$ADMIN_PASS` so Compose passes the literal `$ADMIN_PASS` and the container's shell expands it at runtime. Fixed.

## Review Notes

- The PascalCase `Username`/`Password` fields used in the request bodies are correct and match Portainer's documented swagger schema.
- The 5-minute admin-init window is hardcoded as `5*time.Minute` in source — there is no environment variable to extend it. The post correctly states the value as "5 minutes" without implying configurability.
- `/api/system/status` is the current endpoint; the legacy `/api/status` still works but emits a deprecation warning.
- The example password `YourStr0ngP@ssword!` is 19 characters, which exceeds the 12-character minimum.
- The post sensibly recommends storing the admin password in a secrets manager (Vault, AWS Secrets Manager) — good security guidance.
- `version: "3.8"` in the Compose file is now considered obsolete by recent Compose CLI versions (which ignore the field), but it does not cause errors and is still widely seen in tutorials.

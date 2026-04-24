# Validation Summary: How to Create the Initial Admin User via the Portainer API - User

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer CE/BE
- Portainer HTTP API
- Bash
- `curl`
- `jq`
- Docker Compose

## Sources Consulted
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API documentation index: https://docs.portainer.io/sts/api/docs
- Portainer initial setup documentation: https://docs.portainer.io/start/install-ce/server/setup
- Portainer timeout FAQ: https://docs.portainer.io/faqs/installing/your-portainer-instance-has-timed-out-for-security-purposes-error-fix
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source for admin init handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/admin_init.go
- Portainer source for admin check handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/admin_check.go
- Portainer source for auth handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source for settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source for startup timeout behavior: https://github.com/portainer/portainer/blob/develop/api/http/server.go
- Portainer source for admin initialization monitor: https://github.com/portainer/portainer/blob/develop/api/adminmonitor/admin_monitor.go
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post used `GET /api/system/status` and `.isAdmin` to detect whether initialization was required. The current Portainer API schema for `/api/system/status` exposes version and instance metadata, not admin-existence state, so I changed the check to `GET /api/users/admin/check` and updated the logic to handle `204`, `404`, and timeout-related `303` responses.
- The request bodies for `POST /api/users/admin/init` and `POST /api/auth` used lowercase `username` and `password` keys. Portainer’s documented and generated schema uses `Username` and `Password`, so I updated every example to use the correct field names.
- The initialization-window explanation said that after the window closes you must already be authenticated to create users. Current Portainer behavior is different: after 5 minutes without an admin, the instance times out for security purposes and must be restarted. I corrected the explanation and the conclusion accordingly.
- The examples printed the full response from `/api/users/admin/init`. Portainer’s user response includes the stored password hash, so I removed the success-path response dump and kept only the safe fields needed for confirmation.
- The full automation script used `.isAdmin` from `/api/system/status`, stored a default admin password in the script, and assumed authentication succeeded without checking the returned JWT. I replaced the initialization check, required `ADMIN_PASS` from the environment, and added JWT validation before using authenticated endpoints.
- The optional settings example used `enableTelemetry`, which is not part of the current `settings.settingsUpdatePayload` schema. I replaced it with a valid `UserSessionTimeout` update.
- The Docker Compose example relied on an in-container healthcheck against `http://localhost:9000/api/system/status`, exposed only port `9000`, and used the old lowercase auth payload. Current Portainer installs default to HTTPS on `9443`, and the example healthcheck approach was unreliable, so I switched it to a wait-loop pattern from the init container, updated the URL to `https://portainer:9443`, removed the obsolete top-level `version`, and corrected the JSON payload fields.

## Review Notes
- Portainer’s current documentation and install examples default to HTTPS on port `9443`; `9000` is legacy HTTP and should only be used when explicitly enabled.
- The post’s generic `https://portainer.example.com` examples assume a certificate trusted by the client. The Compose example uses `curl -k` because default local Portainer deployments commonly use a self-signed certificate.

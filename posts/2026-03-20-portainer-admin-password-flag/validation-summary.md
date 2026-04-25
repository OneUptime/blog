# Validation Summary: How to Use the --admin-password Flag in Portainer

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Portainer CE
- Docker CLI
- Docker Compose
- Docker Swarm secrets
- Portainer HTTP API
- bcrypt password hashing

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE initial setup: https://docs.portainer.io/start/install-ce/server/setup
- Portainer timeout FAQ: https://docs.portainer.io/faqs/installing/your-portainer-instance-has-timed-out-for-security-purposes-error-fix
- Portainer password reset FAQ: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-do-i-reset-my-portainer-password
- Portainer reset-admin helper documentation: https://docs.portainer.io/advanced/reset-admin
- Portainer source for CLI flag behavior: https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go
- Portainer source for auth payload and `/api/auth`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source for `/api/users/{id}/passwd`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update_password.go
- Docker Compose `services.command` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Hub tags for `portainer/portainer-ce`: https://hub.docker.com/r/portainer/portainer-ce/tags

## Issues Found
1. **Incorrect `--admin-password-file` behavior.** The post said `--admin-password-file` reads a bcrypt hash from a file. Portainer’s official CLI docs and current source show that this flag reads a plain-text password and hashes it internally before storing it. I updated Step 4, the Compose secrets example, the Swarm secret example, and the conclusion to reflect the correct behavior.
2. **Compose example used brittle quoting for the hash argument.** The original Compose snippet embedded the bcrypt hash in a single string with shell-style quotes. I changed it to list-form `command` syntax while preserving Docker Compose’s required `$$` escaping for literal dollar signs, which is a safer and clearer representation of how Compose passes command arguments.
3. **Swarm service example was missing the Docker host argument.** Portainer’s documented `docker service create` example for this workflow includes `-H unix:///var/run/docker.sock`. I added that argument so the Swarm example matches the official Portainer pattern.
4. **API password-change example had the wrong request body.** The original `PUT /api/users/1/passwd` example only sent `{"Password":"newpassword"}`. Portainer’s current handler requires both the current password and the new password, using `Password` and `NewPassword`. I corrected the payload accordingly.
5. **Reset guidance overstated what is required for existing installs.** The original note said you must delete `portainer.db` or the whole volume to reset the admin password. More precisely, that is only required if you want the startup flags to apply again. For existing installations, Portainer documents supported reset/change paths through the UI, API, and `helper-reset-password`. I clarified the note without restructuring the post.

## Review Notes
- The article is technically relevant and contains working code/configuration after the fixes above.
- The 5-minute initialization-window explanation is accurate and matches Portainer’s install/FAQ documentation.
- The post still uses port `9000` for HTTP examples. Current Portainer install docs default to HTTPS on `9443` and describe `9000` as a legacy HTTP port that can still be exposed when needed, so the examples remain valid because they explicitly publish `9000`.
- The `portainer/portainer-ce:latest` tag was verified to exist on Docker Hub on April 25, 2026, but it is a floating tag. Pinning `lts`, `sts`, or a concrete version would be more reproducible in future revisions.

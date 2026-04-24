# Validation Summary: How to Change the Minimum Password Length in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker Compose
- Bash
- JSON

## Sources Consulted
- Portainer Authentication settings documentation: https://docs.portainer.io/admin/settings/authentication
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source, settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source, password strength check implementation: https://github.com/portainer/portainer/blob/develop/api/http/security/passwordStrengthCheck.go
- Portainer source, admin password file handling: https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go
- Portainer source, internal auth UI slider: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/AuthenticationView/InternalAuth/InternalAuth.tsx
- Docker Compose file reference for top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The draft described the setting as applying to all Portainer user accounts. Official Portainer docs scope the minimum password length setting to internal authentication. I updated the description, introduction, and conclusion to reflect that scope.
- The draft claimed Portainer supports built-in uppercase, lowercase, digit, and symbol password rules, and that Business Edition exposes `PasswordStrengthChecker` policy fields. Current Portainer docs, OpenAPI specs, and source only document `InternalAuthSettings.RequiredPasswordLength`, and the server-side password strength check is length-only. I replaced those sections with accurate text.
- The API example used an outdated full-settings payload and included stale fields such as the old templates URL. The current settings API accepts `InternalAuthSettings` directly, so I simplified the example to a documented partial update and aligned the authentication payload with the current OpenAPI field names.
- The Docker Compose example said `--admin-password-file` should contain a bcrypt hash. Official Portainer docs and source show that this flag reads a plain-text password from the file and hashes it on first startup. I corrected the comment and removed the obsolete Compose top-level `version` field.
- The existing-user behavior section said the new policy is enforced when users next change their password. Official docs say users whose passwords are too short are asked to update them when they next log in. I corrected that explanation.

## Review Notes
- The post’s environment-based password recommendations are general security guidance, not a Portainer-specific enforcement matrix. I clarified that wording to avoid implying Portainer currently enforces those extra rules itself.

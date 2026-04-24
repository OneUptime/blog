# Validation Summary: How to Set Up Portainer with a Custom Admin Password on First Launch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker Swarm
- Docker secrets
- Apache `htpasswd`
- bcrypt

## Sources Consulted
- Portainer docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer docs: Initial setup - https://docs.portainer.io/start/install-ce/server/setup
- Portainer docs: Account settings - https://docs.portainer.io/user/account-settings
- Portainer docs: Reset a user's password - https://docs.portainer.io/sts/admin/user/password
- Portainer docs: Authentication settings - https://docs.portainer.io/admin/settings/authentication
- Docker docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker docs: Services reference (`command`) - https://docs.docker.com/reference/compose-file/services/
- Apache HTTP Server docs: `htpasswd` - https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html

## Issues Found
- The post said `--admin-password-file` should receive a bcrypt hash, but Portainer's current CLI docs specify that this flag reads a plain-text password from a file. I changed Option 2 and the Compose example to use a plain-text password file instead of a hashed file.
- The `htpasswd` example claimed a bcrypt cost factor of `12`, but the command shown did not pass `-C 12`. Apache's `htpasswd` defaults bcrypt cost to `5`, so I corrected the comment and the sample hash prefix to match the command actually shown.
- The Docker Compose section said it used an environment variable, but the example actually used a mounted file. I corrected the wording to match the configuration.
- The verification section said to log in with "the password you hashed", which is incorrect for the file-based flow. I changed this to "the password you configured".
- The original security guidance was broader than the documented file-based workflow. I narrowed it to recommend `--admin-password-file` or Docker secrets over passing the password directly as a Portainer CLI argument.
- The password-rotation path did not match current Portainer docs. I updated it to **My account** for changing the logged-in admin password.
- The minimum-password statement was too absolute. I updated it to say Portainer's default minimum password length is 12 characters, which matches current documentation.

## Review Notes
- The post is technically correct after the fixes and matches current Portainer documentation as of April 24, 2026.
- Portainer's official examples now favor versioned tags such as `:sts` or `:lts` rather than `:latest`; the post's `:latest` examples remain functional but are less reproducible.
- Portainer creates the initial `admin` user automatically when `--admin-password` or `--admin-password-file` is used, but the broader first-run environment onboarding flow may still continue after login.
- The examples were reviewed against current official documentation and were not executed in this workspace.

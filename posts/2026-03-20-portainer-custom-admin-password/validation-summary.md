# Validation Summary: How to Set a Custom Admin Password on First Launch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API
- bcrypt
- Shell scripting

## Sources Consulted
- Portainer initial setup docs: https://docs.portainer.io/start/install-ce/server/setup
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer admin password reset docs: https://docs.portainer.io/advanced/reset-admin
- Portainer FAQ on first-run initialization timeout: https://docs.portainer.io/sts/faqs/installing/i-just-installed-portainer-but-i-cant-access-the-ui-how-do-i-fix-this
- Portainer source for admin initialization API: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/admin_init.go
- Portainer source for user update API: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update.go
- Portainer source for password update endpoint: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update_password.go
- Portainer source for admin initialization timeout monitor: https://github.com/portainer/portainer/blob/develop/api/adminmonitor/admin_monitor.go
- Portainer source for `--admin-password-file` handling and admin creation logic: https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go
- Portainer source for CLI flags: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go

## Issues Found
- The description claimed environment-variable based password setup, but the post did not document a supported Portainer environment-variable method. I corrected the description and overview to match the supported methods actually covered.
- The `--admin-password-file` section said the file should contain a bcrypt hash. Portainer’s official CLI docs and source show that this flag reads a plaintext password and hashes it internally, so I changed the example accordingly.
- The API section described changing the password after first launch, but the post is specifically about first-launch setup. Portainer’s official API examples document `/api/users/admin/init` for first-run initialization, so I replaced the section with the correct first-launch API flow and noted that it only works before an administrator exists.
- The reset section used `portainer/portainer-ce:latest --reset-password`, which is not a documented Portainer Server flag. Portainer’s official reset flow uses `portainer/helper-reset-password`, so I replaced the commands with the supported helper invocation.
- The password requirements and security guidance included unsupported claims, including a TOTP/2FA statement that is not reflected in the current public Portainer docs and source I checked. I rewrote those lines to verified guidance around minimum password length, secrets handling, and supported external authentication options.

## Review Notes
- Portainer’s current docs generally use `:lts` or `:sts` image tags rather than `:latest`. The post still works conceptually, but pinned support-track tags are safer for future updates.
- The Python and Node.js bcrypt one-liners assume the relevant `bcrypt` package is already installed in that environment.
- Docker was not available in the review environment, so validation was performed against Portainer’s official documentation and upstream source rather than by running the containers locally.

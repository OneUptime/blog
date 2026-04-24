# Validation Summary: How to Use a Non-Default Admin Username in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Bash
- `curl`
- `jq`
- OpenSSL

## Sources Consulted
- Portainer initial setup documentation: https://docs.portainer.io/start/install-ce/server/setup
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer auth handler source (`POST /api/auth`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/auth/authenticate.go
- Portainer admin initialization handler source (`POST /api/users/admin/init`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/users/admin_init.go
- Portainer user creation handler source (`POST /api/users`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/users/user_create.go
- Portainer user update handler source (`PUT /api/users/{id}`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/users/user_update.go
- Portainer user deletion handler source (`DELETE /api/users/{id}`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/users/user_delete.go
- Portainer user listing handler source (`GET /api/users`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/users/user_list.go
- Portainer system status handler source (`GET /api/system/status`): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/system/status.go
- Portainer auth/security header handling source: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/security/bouncer.go

## Issues Found
- The post said Portainer does not directly support renaming users and recommended a create-new-plus-delete-old workflow. Current Portainer supports administrator-driven username changes through `PUT /api/users/{id}`, so I replaced the existing-installation method with a rename flow.
- The post instructed readers to delete the old default admin account. In current Portainer, the initial administrator account (`user ID 1`) is protected and cannot be removed through the API, so I removed that guidance and clarified the limitation.
- The scripted setup example wrote credentials to `/run/secrets/portainer-admin`, which is not a portable writable path for a generic shell script. I changed this to a local credentials file created with restrictive permissions.
- The initial admin API example piped the full response to `jq .`. Current Portainer returns the full user object from `POST /api/users/admin/init`, so that output can include the stored password hash. I narrowed the printed output to non-sensitive fields.

## Review Notes
- Portainer also provides `--admin-password` and `--admin-password-file` startup flags, but the official CLI documentation states these create an administrator account called `admin`; they do not let you choose a custom initial username.

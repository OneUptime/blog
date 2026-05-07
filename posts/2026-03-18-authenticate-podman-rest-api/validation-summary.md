# Validation Summary: How to Authenticate with the Podman REST API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman REST API
- Podman system service
- Unix domain sockets
- systemd socket activation
- SSH tunneling
- TLS mutual authentication
- Nginx reverse proxy authentication
- Container registry authentication

## Sources Consulted
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman system connection add documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman API source for `/auth`: https://github.com/containers/podman/blob/main/pkg/api/server/register_auth.go
- Podman API source for `/libpod/images/pull` and `X-Registry-Auth`: https://github.com/containers/podman/blob/main/pkg/api/server/register_images.go
- Podman registry auth helper source: https://github.com/containers/podman/blob/main/pkg/auth/auth.go
- Nginx proxy module documentation for Unix socket `proxy_pass`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The Nginx token-auth example used `proxy_pass http://unix:/run/podman/podman.sock;`, which is not the documented inline Unix socket form. Changed it to `proxy_pass http://unix:/run/podman/podman.sock:/;`.
- The registry-auth section described `POST /auth` as authenticating with a registry. Podman's implementation checks credentials with `NoWriteBack: true`, so it does not persistently log in or store credentials. Updated the wording and comment to say it checks credentials without storing them on disk.
- The `X-Registry-Auth` example used `echo ... | base64`, which can include an encoded trailing newline and may wrap output. Changed it to `printf '%s' ... | base64 -w0` and included `serveraddress`, matching Podman's API documentation for the Libpod pull endpoint.

## Review Notes
Podman is not installed in the local environment, so CLI flags were verified against the current official Podman documentation and upstream source rather than local `--help` output.

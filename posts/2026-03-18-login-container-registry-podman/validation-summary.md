# Validation Summary: How to Login to a Container Registry with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container registries
- Registry authentication
- Container auth files
- TLS options for registries
- CI/CD shell scripting

## Sources Consulted
- Podman `podman-login` documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html
- `containers-auth.json` manual page: https://www.mankier.com/5/containers-auth.json
- GitHub Container registry authentication documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitLab Container Registry authentication documentation: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/

## Issues Found
- The introduction said Podman stores credentials "securely." Current Podman documentation describes the default auth file as containing base64-encoded credentials, and the default Linux location is under `${XDG_RUNTIME_DIR}`. I changed the wording to say Podman stores credentials in an auth file.
- The auth-file section listed a rootful default path of `/run/containers/0/auth.json`. Current Podman documentation lists the Linux default as `${XDG_RUNTIME_DIR}/containers/auth.json`, with `$HOME/.config/containers/auth.json` on Windows/macOS. I updated the example comments accordingly.
- The command labeled "View the default auth file path" used `podman login docker.io --get-login`, but `--get-login` returns the logged-in username or an error. I changed this to `podman login docker.io --verbose`, which Podman documents as printing detailed credential-store information including the `Used:` auth file path during login.
- The verification section described auth file values as base64-encoded tokens. Podman's auth file stores base64-encoded credentials for username/password-style auth entries. I changed "tokens" to "credentials."

## Review Notes
- Podman's default auth file under `${XDG_RUNTIME_DIR}` is usually ephemeral on Linux and may not persist across reboot. For persistent credentials, Podman's own examples use `--authfile ~/.config/containers/auth.json`.
- The local environment did not have `podman` installed, so CLI behavior was checked against current official Podman documentation rather than local `podman --help` output.

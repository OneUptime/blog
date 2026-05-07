# Validation Summary: How to Use Authentication Files with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container registry authentication
- containers-auth.json
- Docker-compatible registry auth files
- Shell scripting for CI/CD
- JSON auth file structure

## Sources Consulted
- Podman `podman-login(1)` documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- Podman `podman-pull(1)` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-pull.1.html
- Podman `podman-build(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- `containers-auth.json(5)` manual page: https://man.archlinux.org/man/containers-auth.json.5

## Issues Found
- The default auth file section listed `/run/containers/0/auth.json` as the rootful default. Current Podman documentation describes the Linux default as `${XDG_RUNTIME_DIR}/containers/auth.json`, with other readable locations including `${XDG_CONFIG_HOME}/containers/auth.json`, `$HOME/.docker/config.json`, and `$HOME/.dockercfg`. I removed the rootful-specific default and added the persistent per-user containers auth path.
- The post suggested `podman info --format '{{.Store}}'` to check which auth file Podman is using. That command reports storage information, not the auth file path. I replaced it with `podman login --verbose docker.io`, which Podman documents as showing the credential store used during login.
- The CI/CD script wrote credentials to `/tmp/containers/auth.json` when `XDG_RUNTIME_DIR` was unset, but Podman would not necessarily discover that path automatically. I added `export REGISTRY_AUTH_FILE="$AUTH_FILE"` so subsequent Podman commands use the generated file.
- The post described auth files as storing base64-encoded credentials in all cases. The `containers-auth.json(5)` documentation also allows credential-helper references. I adjusted the wording to say auth files store or reference credentials and commonly contain base64-encoded credentials.

## Review Notes
The manual auth-file examples are structurally valid for the simple `auths` format. For stronger security in future revisions, the post could mention `podman login --password-stdin`, `REGISTRY_AUTH_FILE`, and credential helpers more prominently, because base64 encoding is not encryption.

# Validation Summary: How to Add a Custom Registry to Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container registries
- containers-registries.conf
- containers-auth.json
- containers-certs.d
- TLS configuration for private registries

## Sources Consulted
- Podman installation and registries.conf documentation: https://podman.io/docs/installation
- containers-registries.conf(5): https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- containers-certs.d(5): https://github.com/containers/image/blob/main/docs/containers-certs.d.5.md
- containers-auth.json(5): https://github.com/containers/image/blob/main/docs/containers-auth.json.5.md
- podman-login(1): https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- podman-pull(1): https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- podman-push(1): https://docs.podman.io/en/latest/markdown/podman-push.1.html
- podman-search(1): https://docs.podman.io/en/stable/markdown/podman-search.1.html
- podman-info(1): https://docs.podman.io/en/latest/markdown/podman-info.1.html
- podman-tag(1): https://docs.podman.io/en/latest/markdown/podman-tag.1.html
- podman-inspect(1): https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The post used `podman search myregistry.example.com/myapp` to verify that a pushed image exists in the registry. Official Podman documentation says `podman search` is not a reliable way to determine image presence because registry search behavior varies and some registries do not support searching. Changed the verification command to `podman pull myregistry.example.com/myapp:latest`, which directly checks that the image can be retrieved from the registry.

## Review Notes
- The `registries.conf` examples use the current TOML v2 `[[registry]]` format, including valid `prefix`, `location`, `insecure`, and `unqualified-search-registries` fields.
- The authentication examples use valid `podman login`, `--username`, and `--password-stdin` options. The default Linux auth file path under `${XDG_RUNTIME_DIR}/containers/auth.json` is correct, but it is runtime storage and may not persist across reboot unless an explicit persistent `--authfile` is used.
- The TLS certificate directory and file names match `containers-certs.d(5)`. User-level certificate directories under `$HOME/.config/containers/certs.d` are also supported, though the post only shows the system-level path.

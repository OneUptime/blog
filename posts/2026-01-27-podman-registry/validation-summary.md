# Validation Summary: How to Configure Podman Registry

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Podman
- containers/image `registries.conf`
- Container registries and registry mirrors
- Docker Hub / Docker Distribution registry
- Registry authentication with `auth.json`
- TLS and custom CA certificates for container registries

## Sources Consulted
- Podman `podman-login(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- Podman `podman-pull(1)` documentation: https://docs.podman.io/en/v5.0.2/markdown/podman-pull.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- containers/image `containers-registries.conf(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- `containers-auth.json(5)` manual page: https://man.archlinux.org/man/containers-auth.json.5
- `containers-certs.d(5)` manual page: https://man.archlinux.org/man/containers-certs.d.5.en
- CNCF Distribution pull-through cache documentation: https://distribution.github.io/distribution/recipes/mirror/
- Debian package information for `golang-docker-credential-helpers`: https://packages.debian.org/sid/golang-docker-credential-helpers

## Issues Found
- The post said Podman used "two main configuration files" while listing three. Updated this to describe the relevant registry and auth files, including the Linux default `${XDG_RUNTIME_DIR}/containers/auth.json` and persistent `~/.config/containers/auth.json` fallback.
- The `short-name-mode` descriptions were inaccurate. Updated `enforcing`, `permissive`, and `disabled` behavior to match `containers-registries.conf(5)`, including interactive prompting and non-interactive behavior.
- The unqualified image flow implied Podman always searches registries in order. Updated the explanation and diagram to account for short-name prompting.
- The per-registry TLS example incorrectly used a `[[registry.mirror]]` table to describe a custom CA. Replaced it with the correct `certs.d` location and added the rootless certificate directory.
- Mirror examples manually added the original registry as a mirror fallback. Removed those duplicate mirror entries because Podman automatically tries the primary registry after mirrors.
- The air-gapped registry remapping example reused one internal location for multiple public registries and then attempted to block the same prefixes. Updated the mapping to distinct internal namespaces and removed the conflicting block entries.
- The credential-management section implied `~/.config/containers/auth.json` was always the primary auth file. Updated the Linux default auth-file behavior and added an explicit persistent-login example.
- The credential-helper install example referenced an unverified Fedora package name. Replaced it with a generic instruction and kept the verified Debian/Ubuntu package example.
- The CI login example did not persist credentials on Linux across reboot. Added `--authfile ~/.config/containers/auth.json`.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against the official Podman documentation and related official/manual pages rather than local `--help` output. The post is now technically valid for current Podman/containers-common behavior, but readers should still adapt package names and certificate trust-store commands to their Linux distribution.

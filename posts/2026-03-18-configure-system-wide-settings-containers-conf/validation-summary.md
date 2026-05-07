# Validation Summary: How to Configure System-Wide Settings in containers.conf

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman
- containers.conf
- TOML configuration
- Linux container runtime configuration
- Netavark networking

## Sources Consulted
- Podman `podman(1)` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman-info(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-network(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- containers/common `containers.conf(5)` official documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- TOML language specification: https://toml.io/en/

## Issues Found
- The opening text claimed system-wide `containers.conf` settings enforce behavior across every user. Updated it to describe these settings as system-wide defaults because user-level configuration files can override system-wide files.
- The example used `pull_policy = "newer"` in `[engine]`, but current `containers.conf(5)` documents `always`, `missing`, and `never` for `pull_policy`. Changed the example to `pull_policy = "missing"`.
- The security example appended a second `[containers]` table to `/etc/containers/containers.conf`, which would make the TOML invalid if the earlier example had already created a `[containers]` table. Changed it to create `/etc/containers/containers.conf.d/50-security.conf`.
- The security example said `no_hosts = false` disabled privileged containers. That setting controls `/etc/hosts` management, not privileged mode. Changed it to `privileged = false`.
- The verification example used `podman info --format '{{range .Host.ConfigFiles}}{{.}}{{"\n"}}{{end}}'`, but current Podman documentation and source do not expose a `Host.ConfigFiles` field. Replaced it with documented `podman info` host fields for runtime, log driver, and network backend.
- The precedence section claimed that `/etc/containers/containers.conf.d/` prevents users from overriding settings. Updated the wording to clarify that system drop-ins override earlier system-wide files, while user-level configs can still take precedence.
- The summary said drop-in files should be used for settings that must be enforced. Updated it to state that `containers.conf` is not a policy enforcement mechanism by itself.

## Review Notes
The commands and configuration are now aligned with current Podman and containers/common documentation. The examples remain Linux-focused and assume Podman is installed with the standard system paths; on Podman machine environments, the same configuration would need to be edited inside the VM.

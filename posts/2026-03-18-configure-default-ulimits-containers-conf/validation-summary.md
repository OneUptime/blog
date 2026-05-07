# Validation Summary: How to Configure Default Ulimits in containers.conf

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman
- containers.conf
- Linux ulimits
- Linux pids cgroup limits
- Shell commands

## Sources Consulted
- Podman `podman-run(1)` documentation for `--ulimit`, `--pids-limit`, default `nofile`/`nproc` behavior, and the warning not to use `nproc` as a container process limit: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman(1)` documentation for global options, `--log-level`, and configuration file precedence: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- `containers.conf(5)` manual for TOML format, user configuration path, `default_ulimits`, and `pids_limit`: https://man.archlinux.org/man/containers.conf.5.en
- Ubuntu `containers.conf(5)` manual for `default_ulimits` format: https://manpages.ubuntu.com/manpages/noble/en/man5/containers.conf.5.html

## Issues Found
- The post described `nproc` as a maximum number of processes per container and used it to prevent fork bombs. Podman documentation warns that `nproc` is a per-user process limit, not a container process limit, and recommends `--pids-limit` for limiting container processes. I replaced those examples with `pids_limit` in `containers.conf` and `--pids-limit` at runtime.
- The post said the default `nofile` value is usually 1024. Current Podman documentation says that if `nofile` and `nproc` are unset, Podman uses 1048576 unless overridden in `containers.conf` or capped by the rootless user's hard limit. I updated the note.
- The debug command attempted to run `ulimit` directly in the container. Since `ulimit` is normally a shell builtin, I changed the example to run it through `sh -c`.
- The post made an absolute claim that container ulimits cannot exceed host limits. Podman documentation gives a rootless-specific hard-limit cap and notes rootful mode can often use unlimited values. I narrowed the guidance to rootless mode.

## Review Notes
Podman was not installed in the local review environment, so commands could not be executed locally. The review was performed against current Podman documentation and authoritative `containers.conf(5)` manual pages.

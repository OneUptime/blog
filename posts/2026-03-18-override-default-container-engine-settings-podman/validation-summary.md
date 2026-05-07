# Validation Summary: How to Override Default Container Engine Settings in Podman

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman
- containers.conf
- OCI runtimes
- crun
- runc
- Linux cgroups
- Podman event logging

## Sources Consulted
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman `podman-events(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Containers `containers.conf(5)` documentation: https://raw.githubusercontent.com/containers/container-libs/main/common/docs/containers.conf.5.md
- crun official repository: https://github.com/containers/crun

## Issues Found
- The event logging and cgroup examples used `cat >>` to append another `[engine]` table to the same TOML file. TOML does not allow redefining the same table in a single file, so those examples would create an invalid `containers.conf`. Changed those examples to write a complete `[engine]` configuration with `cat >`.
- The pull policy comment listed `newer`, but current `containers.conf(5)` documents `always`, `missing`, and `never` for `pull_policy`. Removed `newer` from the comment.
- The image format comment listed `docker`, but current `containers.conf(5)` documents `oci`, `v2s2`, and `v2s1` for `image_default_format`. Updated the comment.
- The events log size option was written as `events_log_file_max_size`, but the documented key is `events_logfile_max_size`. Corrected the key and used a string value as shown by the documented size format.
- The complete `[engine]` example included `label = true`, but SELinux labeling is a `[containers]` table option, not an `[engine]` option. Removed it from the engine-only example.
- The commented `static_dir` and `volume_path` examples used rootful storage paths in a user configuration example. Updated them to rootless-style paths under `/home/user/.local/share/containers`.

## Review Notes
- Podman was not installed in the local review environment, so CLI behavior was verified against official Podman documentation instead of local command execution.
- The `podman info --format` examples are consistent with Podman's documented Go template behavior, where Go template fields use upper-case struct names while JSON output uses lower-case field names.

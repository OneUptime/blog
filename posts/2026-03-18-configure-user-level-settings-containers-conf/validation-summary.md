# Validation Summary: How to Configure User-Level Settings in containers.conf

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Podman
- containers.conf
- Rootless containers
- XDG configuration paths
- TOML configuration

## Sources Consulted
- Podman manual: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman info manual: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- containers/common containers.conf manual: https://raw.githubusercontent.com/containers/container-libs/main/common/docs/containers.conf.5.md
- containers/common configuration load order: https://raw.githubusercontent.com/containers/container-libs/main/common/docs/containers-config.5.md

## Issues Found
- `dns_servers` was shown under `[network]`, but current `containers.conf` documents it under `[containers]`. Moved it into the `[containers]` table.
- The customization example appended a second `[containers]` table to the same `containers.conf`, which would make the TOML invalid. Changed the example to use a user-level `containers.conf.d` drop-in file with a late-sorting filename.
- The resource defaults included invalid or misplaced keys: `memory`, `cpu_shares`, `stop_signal`, `stop_timeout`, and `workdir`. Replaced them with current documented examples using `cgroup_conf`, `pids_limit`, `init`, and `shm_size`.
- `podman info --format '{{.Host.ConfigFiles}}'` was not supported by the documented `podman info` output. Replaced it with a JSON-based check for effective runtime and log driver values.
- The `pull_policy` comment listed `newer`, but current `containers.conf` documents `always`, `missing`, and `never`. Removed `newer`.
- The `tmp_dir` comment described a build temporary directory. Current docs describe `tmp_dir` as a per-boot libpod temporary directory and `image_copy_tmp_dir` as the temporary location for image content. Updated the example to use `image_copy_tmp_dir`.
- The runtime verification command inspected `/proc/1/cmdline` inside a test container, which does not show the selected OCI runtime. Replaced it with a `podman info --format json` check.
- The test command used the short image name `alpine`, which can be ambiguous depending on `registries.conf` short-name policy. Updated it to `docker.io/library/alpine:latest`.

## Review Notes
Podman is not installed in this review workspace, so commands were validated against official documentation and TOML snippets were syntax-checked locally rather than executed with Podman.

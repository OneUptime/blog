# Validation Summary: How to Configure the Log Driver for a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers.conf
- Podman Compose / Compose logging configuration
- systemd journald
- Container log drivers

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman-logs` documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman `podman-compose` documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Compose Specification logging section: https://compose-spec.github.io/compose-spec/spec.html#logging
- containers/common `containers.conf` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md

## Issues Found
- The post described `json-file` as storing JSON logs. Podman documents `json-file` as an alias for `k8s-file`, so I changed the comparison text to say it uses the Kubernetes log format.
- The post used Docker-style `max-file` log option examples. Current Podman documentation lists `path`, `max-size`, `tag`, and newer journald `label` options, but not `max-file`, so I removed `max-file` from the CLI and Compose examples.
- The post described log rotation via `max-size/max-file`. Podman's documented `max-size` limits the log file size; it does not document Docker-style `max-file` rotation, so I changed this to "size limits via max-size."
- The post used `{{.LogPath}}` to inspect file log paths. The current Podman container inspect documentation exposes log path under `HostConfig.LogConfig.Path`, so I updated the commands to `{{.HostConfig.LogConfig.Path}}`.
- The post stated that journald is always the default. Podman run docs list journald as the default, while containers.conf documents that journald is used when the systemd journal is readable and writable, otherwise k8s-file is used. I clarified the default wording accordingly.
- The post said each log driver supports additional options. Podman options are driver-specific, so I changed the wording to avoid implying every option works with every driver.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior could not be tested directly with `podman --help` or live containers. The review was completed against current official Podman documentation, the official containers/common configuration documentation, and the Compose Specification.

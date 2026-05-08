# Validation Summary: How to Use the k8s-file Log Driver with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- k8s-file container log driver
- containers.conf
- Podman Compose / Compose logging configuration
- Kubernetes / CRI-style log format
- Shell and awk log parsing

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- containers.conf manual page: https://man.archlinux.org/man/containers.conf.5.en
- Kubernetes Logging Architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Grafana Loki CRI parsing documentation, used as an authoritative explanation of the CRI log field format: https://grafana.com/docs/loki/latest/clients/promtail/stages/cri/

## Issues Found
- The post stated that k8s-file is always Podman's default log driver. Current Podman documentation says journald is the default in `podman run`, and `containers.conf` documentation says journald is used when the systemd journal is readable and writable; otherwise, k8s-file is used. I changed the wording to describe k8s-file as an available Kubernetes-compatible file driver and to recommend selecting it explicitly when needed.
- The example default-driver output showed only `k8s-file`. I changed it to note that the output may be `journald` or `k8s-file`, depending on the host configuration.
- The initial `podman run` example relied on k8s-file being the default. I added `--log-driver k8s-file` so the rest of the tutorial consistently uses that driver.
- The post used `{{.LogPath}}` to find log files. Podman inspect examples and Red Hat/Podman-compatible inspect output expose the log file path under `{{.HostConfig.LogConfig.Path}}`, so I updated all log-path lookups.
- The configuration example reused the container name `web` after already creating it, which would fail unless the old container was removed. I added `podman rm -f web` before recreating the container with log-size options.
- The comparison section said k8s-file has "No Docker tool compatibility." Podman documents `json-file` as an alias to `k8s-file` for scripting compatibility, but the on-disk format is not Docker's JSON log format. I changed the disadvantage to say it is not the same on-disk format as Docker's json-file logs.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was verified against current official documentation rather than local `--help` output. The Compose logging snippet matches the Compose logging structure, but Podman Compose behavior can vary by compose provider and version.

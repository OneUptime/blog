# Validation Summary: How to Implement Container Logging Best Practices with Podman

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Podman container logging
- containers.conf
- systemd-journald and journalctl
- Structured logging with Pino, structlog, and zerolog
- Grafana Alloy / Loki log forwarding
- Fluentd log forwarding
- Shell scripting for log alert checks

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `logs` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman configuration files documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- containers.conf reference via containers/common package: https://pkg.go.dev/github.com/containers/common/pkg/config
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- Pino API documentation: https://github.com/pinojs/pino/blob/main/docs/api.md
- structlog API/configuration documentation: https://www.structlog.org/en/25.5.0/api.html
- zerolog project documentation: https://github.com/rs/zerolog
- Grafana Promtail lifecycle documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy documentation: https://grafana.com/docs/alloy/latest/

## Issues Found
- The post described `k8s-file` as the rootless default and `json-file` as Docker-compatible JSON. Podman documentation states current supported drivers include `k8s-file`, `journald`, `none`, `passthrough`, and `passthrough-tty`, and that `json-file` is an alias for `k8s-file`. Updated those driver comments.
- The default log driver example was labeled system-wide while using `~/.config/containers/containers.conf`, which is user-level configuration. Updated the wording and added the correct `/etc/containers/containers.conf` path for system-wide defaults.
- The log-size example was also labeled system-wide while using `~/.config/containers/containers.conf`. Updated it to "User-level defaults."
- The contextual Pino example used `os.hostname()` without importing `os`, and its sample output incorrectly duplicated the request ID as the hostname. Added the missing import and corrected the sample hostname.
- The log aggregation example used Promtail, which Grafana documents as end-of-life as of March 2, 2026. Replaced the Promtail command with a Grafana Alloy example for Loki forwarding.

## Review Notes
Podman was not installed in the local workspace, so CLI verification used official Podman documentation rather than local `podman --help` output. The remaining examples are technically sound as illustrative snippets, but real production log aggregation still requires complete collector configuration files for Alloy or Fluentd.

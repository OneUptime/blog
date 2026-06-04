# Validation Summary: How to Use Docker Compose with Host PID Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Docker Engine PID namespaces
- Linux process namespaces
- Linux capabilities and seccomp
- nsenter
- Prometheus Node Exporter

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Engine container runtime privileges and Linux capabilities: https://docs.docker.com/engine/containers/run/
- Docker seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- Docker container security FAQs: https://docs.docker.com/security/faqs/containers/
- Linux namespaces manual page: https://man7.org/linux/man-pages/man7/namespaces.7.html
- Linux setns manual page: https://man7.org/linux/man-pages/man2/setns.2.html
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from the snippets because the current Compose Specification keeps `version` only for backward compatibility and Docker Compose warns that it is obsolete.
- The process-monitor example used Alpine with `ps aux --sort=-%cpu`, but Alpine's default BusyBox `ps` does not support `--sort`. Changed that example to `ubuntu:24.04`, which includes a `ps` implementation that supports the shown sorting option.
- The process-monitor example wrapped `$(date)` in single quotes, so it would print the literal text instead of the current date. Changed it to escaped Compose interpolation with `$$(date)` so the shell expands it at runtime.
- The nsenter example said `privileged: true` is required. Updated the comment to say it is the simplest option for namespace debugging, because entering namespaces is capability-dependent and `privileged` is a broad shortcut rather than the only possible configuration.
- The nginx reload example printed `$$NGINX_PID` inside single quotes, so the log message would not show the actual PID. Changed the echo command to use double quotes so the shell expands the variable.

## Review Notes
The remaining examples are technically valid, but several behaviors are Linux-host specific and may differ under Docker Desktop because host PID mode applies inside Docker Desktop's Linux VM rather than directly to the macOS or Windows host.

# Validation Summary: How to View Podman Container Logs with journalctl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- systemd user services
- systemd journal
- journalctl
- journald logging driver

## Sources Consulted
- systemd `journalctl(1)` local man page and `journalctl --help`, systemd 255
- systemd `systemd.journal-fields(7)` local man page
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman logs documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman events journald field documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Docker journald logging driver documentation, used only to cross-check common container journald metadata field behavior: https://docs.docker.com/engine/logging/drivers/journald/
- Red Hat Ansible Automation Platform containerized installation documentation, for `journalctl CONTAINER_NAME=<container_name>` usage with Podman-managed services: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/containerized_installation/

## Issues Found
- The priority filter comments said `-p err` showed only error messages and `-p crit` showed only critical and emergency messages. `journalctl -p` with a single level shows that level and all more important levels, so the comments were corrected to "errors and higher-priority messages" and "critical and higher-priority messages."
- The output format comments were swapped for JSON modes. `-o json` emits newline-separated JSON objects, while `-o json-pretty` emits multi-line pretty-printed JSON. The comments were corrected.

## Review Notes
The `--user -u` examples are appropriate for containers running as user systemd services. For system-level units, the equivalent commands would omit `--user` or use system journal access. Podman was not installed in the local environment, so Podman-specific behavior was checked against official Podman documentation and Red Hat documentation rather than local `podman --help` output.

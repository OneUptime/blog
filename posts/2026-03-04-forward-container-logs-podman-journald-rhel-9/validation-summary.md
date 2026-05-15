# Validation Summary: How to Forward Container Logs from Podman to journald on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- containers.conf
- systemd-journald and journalctl
- systemd services
- Podman Quadlet
- rsyslog

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman container inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Red Hat Enterprise Linux 9 container documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- containers.conf manual reference: https://man.archlinux.org/man/containers.conf.5.en
- Docker journald driver documentation for journald metadata field behavior shared by container journald drivers: https://docs.docker.com/engine/logging/drivers/journald/
- rsyslog imjournal documentation: https://docs.rsyslog.com/doc/configuration/modules/imjournal.html

## Issues Found
- The introduction stated that journald is the recommended production driver. Podman documentation states journald is the default when the systemd journal is available, so the wording was changed to avoid overstating an official recommendation.
- The diagram and benefits referred to persistent storage and storage quotas. journald persistence depends on journal configuration and retention policy, so the wording was changed to "Journal retention" and "retention controls."
- The default driver note was too broad. It now states that journald is typical on RHEL when the systemd journal is readable and writable, matching containers.conf behavior.
- The `journalctl -t podman` example was described as showing all container logs. That command filters Podman process/event messages, not container stdout/stderr, so the label and command were corrected to use `SYSLOG_IDENTIFIER=podman` for Podman events.
- The systemd service section said logs automatically go to journald. It now distinguishes systemd unit logs from container stdout/stderr and notes that container fields are available when the journald log driver is used.
- The rsyslog forwarding example filtered `podman` or `conmon`, which can miss container application logs when journald tags are used. It now demonstrates filtering by the custom journald tag via `$programname`.

## Review Notes
The post is technically relevant and the remaining commands and configuration examples align with current Podman and RHEL 9 documentation. The local review environment did not have Podman installed, so CLI behavior was verified against official documentation rather than local `--help` output.

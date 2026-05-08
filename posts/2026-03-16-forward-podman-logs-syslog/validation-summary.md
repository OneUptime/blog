# Validation Summary: How to Forward Podman Container Logs to syslog

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman container logging
- journald / systemd journal
- rsyslog
- syslog forwarding
- util-linux `logger`
- Bash

## Sources Consulted
- Podman `podman-run` documentation for `--log-driver` and `--log-opt`: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `podman-container-inspect` documentation for `.HostConfig.LogConfig.Path`: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- rsyslog official documentation home, confirming official docs location: https://docs.rsyslog.com/doc/
- rsyslog `imjournal` module documentation: https://docs.rsyslog.com/doc/configuration/modules/imjournal.html
- rsyslog `imfile` module documentation: https://docs.rsyslog.com/doc/configuration/modules/imfile.html
- rsyslog `programname` property documentation: https://docs.rsyslog.com/doc/reference/properties/message-programname.html
- rsyslog `omfwd` module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- Linux `logger(1)` manual page: https://man7.org/linux/man-pages/man1/logger.1.html
- Local `logger --help` output for CLI option verification.

## Issues Found
- The journald-to-rsyslog file example wrote to `/var/log/containers/myapp.log` before ensuring `/var/log/containers` existed. Added `sudo mkdir -p /var/log/containers` before restarting rsyslog.
- The journald-to-rsyslog example presented file forwarding and remote forwarding as alternatives, but the active `& stop` after the file rule would prevent the remote rule from running if pasted unchanged. Commented the remote alternative so the file example is internally consistent.
- The direct `logger` section called a shell pipeline a sidecar approach. Changed that wording to "shell pipeline" to match the implementation.
- The stderr-only forwarding command did not actually pipe stderr into `logger`; with `1>/dev/null | logger`, stderr remains outside the pipe. Replaced it with Bash process substitution: `podman logs -f my-container 1>/dev/null 2> >(logger -t my-container -p local0.err) &`.
- The file-watching approach did not specify that Podman must be using a file-based log driver; with the default journald driver, `.HostConfig.LogConfig.Path` is empty. Updated the section to state it applies to `k8s-file` and added a `podman run --log-driver k8s-file` example.
- The remote-forwarding snippet had an active `*.* @@syslog-server.example.com:514` rule immediately before the "Forward only container logs" rule, which would forward all logs and potentially duplicate container logs. Commented out the all-log forwarding examples so the filtered rule matches the surrounding explanation.

## Review Notes
The examples use traditional rsyslog selector/action shorthand such as `@@host` and file actions, which remains supported, while the `omfwd` example uses modern RainerScript with a queue. The direct `logger` approach is workable for simple cases but is less robust than journald or rsyslog-managed forwarding because it depends on the shell pipeline process staying alive.

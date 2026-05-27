# Validation Summary: How to Create and Manage Systemd Services on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux
- systemd service units
- systemctl
- journalctl
- systemd timer units
- systemd resource control and sandboxing directives
- Node.js service deployment

## Sources Consulted
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd.resource-control official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd.timer official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemctl official manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl official manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local systemd 255 man pages and command help for systemd.service(5), systemd.unit(5), systemd.exec(5), systemd.resource-control(5), systemd.timer(5), systemctl, journalctl, systemd-analyze, and ss.

## Issues Found
- The example placed `StartLimitBurst=` and `StartLimitIntervalSec=` in the `[Service]` section. These are unit-level settings documented in systemd.unit, so they were moved to `[Unit]`.
- The basic Node.js service used `Type=simple` and described startup as occurring once the `ExecStart` process was running. Current systemd documentation recommends `Type=exec` for long-running services when possible because it waits until the binary has been executed, so the example was updated to `Type=exec`.
- The `network.target` comment said networking was available. `network.target` is the basic network stack target and does not guarantee configured connectivity, so the comment was made more precise.
- The `Type=forking` example said `PIDFile` must be specified and used `/var/run`. systemd recommends `PIDFile` for forking services when a daemon writes one and typically uses `/run`, so the wording and path were corrected.
- The environment-file section called `EnvironmentFile=` preferred for secrets and included a password example. systemd documents environment variables as unsuitable for secrets, so the text now says environment files are for many variables but not secrets, and the password example was removed.
- The resource-limit example used `LimitNPROC=` as a service process limit. systemd documents that `LimitNPROC=` is per real UID and recommends `TasksMax=` for service task limits, so the example was changed to `TasksMax=4096`.
- The troubleshooting diagram mapped exit code 217 to namespace setup and exit code 200 to cgroup setup. systemd-specific exit codes define 217 as user setup, 200 as working-directory setup, 205 as resource-limit setup, 219 as cgroup setup, and 226 as namespace setup; the diagram was corrected.

## Review Notes
The commands and most unit directives were correct for current systemd. Environment variables are still shown because they are common for non-secret configuration, but future revisions could mention systemd credentials or an external secret manager for sensitive values.

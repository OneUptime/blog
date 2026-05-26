# Validation Summary: How to Use Ansible to Configure Service Watchdog

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd service units
- systemd watchdog and notification protocol
- Linux hardware watchdog configuration
- Python Unix domain sockets
- Go Unix domain sockets and time durations
- journalctl and systemctl

## Sources Consulted
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/254/systemd.unit.html
- systemd-system.conf official manual: https://www.freedesktop.org/software/systemd/man/254/systemd-system.conf.html
- systemd-notify official manual: https://www.freedesktop.org/software/systemd/man/254/systemd-notify.html
- sd_notify official manual: https://www.freedesktop.org/software/systemd/man/254/sd_notify.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- Go time package documentation: https://pkg.go.dev/time#ParseDuration
- NGINX official changelog: https://nginx.org/en/CHANGES

## Issues Found
- The service template placed `StartLimitBurst`, `StartLimitIntervalSec`, and `FailureAction` in the `[Service]` section. `StartLimitBurst`, `StartLimitIntervalSec`, and `StartLimitAction` are unit-level settings, so the restart limit configuration was moved to `[Unit]`.
- The repeated-failure action used `FailureAction`, which triggers when a unit enters failed state rather than specifically when the start-rate limit is hit. This was changed to `StartLimitAction` and the explanatory text was updated accordingly.
- `NotifyAccess` was hard-coded to `main`, which does not work for the wrapper example where watchdog notifications are sent by a helper process in the service cgroup. The template now accepts `svc_notify_access`, and the wrapper example sets it to `all`.
- The Python `sd_notify` example did not handle systemd abstract namespace notify sockets, where `NOTIFY_SOCKET` starts with `@`. It now converts that form to Python's initial-null-byte Unix socket address form.
- The Go watchdog example used a fixed 15-second interval instead of reading `WATCHDOG_USEC` from systemd. It now parses `WATCHDOG_USEC`, pings at half the configured interval, and handles abstract namespace notify sockets.
- The wrapper script notified readiness before starting the wrapped application. It now starts the application first, sends `READY=1` only after the health endpoint succeeds, and keeps the watchdog loop tied to the application process.
- The existing-service drop-in example claimed nginx supports watchdog notifications since 1.19.5. The official nginx changelog does not support that claim, and enabling `WatchdogSec` on a service that does not send `WATCHDOG=1` would cause watchdog failures. The example was changed to a generic existing service that already supports `sd_notify` watchdog messages.
- The hardware watchdog Ansible example wrote into `/etc/systemd/system.conf.d` without ensuring that directory exists. A directory creation task was added before deploying the template.

## Review Notes
- The Python snippet and wrapper shell script passed local syntax checks.
- A rendered representative systemd unit passed `systemd-analyze verify`.
- Go is not installed in the review environment, so the Go snippet was reviewed against the official Go documentation and by inspection rather than compiled locally.

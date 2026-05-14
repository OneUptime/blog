# Validation Summary: How to Start, Stop, Restart, and Reload Services with systemctl on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd
- systemctl
- Linux service units
- Apache httpd service management examples

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- systemctl(1) manual page on the local system
- systemd.service(5) manual page on the local system
- systemctl --help output on the local system

## Issues Found
- Clarified `systemctl is-active` output. The original text said it prints only `active` or `inactive`; the official manual describes it as printing the current unit state, which can include other states. Updated the wording to say `active` and `inactive` are common states.
- Clarified `systemctl stop` behavior. The original text said stopping shuts the service down immediately and terminates active connections or processes. systemd deactivates the unit and service-specific stop behavior can be graceful or timeout-driven, so the wording now says systemd asks the service to shut down and connections/processes may be closed.
- Softened the reload behavior description. Reload is intended to reload service configuration without interrupting execution, but preserving every active connection is service-dependent. Updated the text to avoid promising all connections stay alive.
- Corrected the reload support check. The original text recommended checking only for `ExecReload` in the unit file and said reload fails if it is absent. `ExecReload` is one way to implement reload, but systemd exposes the effective reloadability through `CanReload`. Updated the command to `systemctl show -p CanReload httpd`.
- Clarified `reload-or-restart` behavior. Added that it starts the service if it is not already running, matching the `systemctl(1)` manual.
- Corrected multiple-service ordering wording. The original text said services are processed in the order listed. systemd queues jobs and applies dependency ordering, so the post now says not to rely on list order and to model ordering in unit dependencies.

## Review Notes
The examples omit the `.service` suffix, which is valid for service units in common `systemctl` usage and matches RHEL examples using `httpd` or `httpd.service`. The post intentionally focuses on current-session service operations and correctly distinguishes them from boot-time enablement.

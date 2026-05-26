# Validation Summary: How to Use Ansible to Configure Service Auto-Restart on Failure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd service units
- Linux service management
- Jinja2 templates
- Bash wrapper scripts

## Sources Consulted
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/254/systemd.unit.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Local systemd 255 man pages and `systemctl --help` output

## Issues Found
- The restart policy table and diagram described signal handling too broadly. systemd treats `SIGHUP`, `SIGINT`, `SIGTERM`, and `SIGPIPE` as clean exits for most service types, and `on-abort` only restarts for uncaught signals not treated as clean exits. Updated the wording to distinguish unclean signals.
- The advanced template placed `StartLimitBurst`, `StartLimitIntervalSec`, and `StartLimitAction` in the `[Service]` section. These are unit-level directives documented in `systemd.unit(5)`, so they were moved to `[Unit]`.
- The rate-limiting explanation described only restarts. systemd start rate limiting applies to all starts, including manual starts, so the wording now says it limits how many times the unit can be started in the configured window.
- The `StartLimitAction=none` description implied that the action itself stops restarts. The start limit refuses the start; `none` means no additional action is taken. Updated the description accordingly.
- The post stated that systemd does not natively support backoff. systemd 254 and newer support stepped restart delays with `RestartSteps` and `RestartMaxDelaySec`, so the section was updated to describe native stepped delays and keep the wrapper approach for older systemd releases.
- The backoff wrapper wrote state to `/tmp` and included an unused reset script. The state file was moved to `/run`, and the unused reset script was removed.

## Review Notes
- The Ansible examples use `ansible.builtin.systemd`, which remains commonly used as a compatibility alias, while current Ansible documentation presents `ansible.builtin.systemd_service` as the canonical module name.
- The notification script is illustrative and assumes `WEBHOOK_URL` is supplied in the target environment.

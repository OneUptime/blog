# Validation Summary: How to Use Ansible to Reload Service Configuration Without Restart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd and systemctl
- Nginx
- PostgreSQL
- HAProxy
- Apache HTTP Server
- Docker Engine
- Redis
- systemd-journald
- Linux service signals

## Sources Consulted
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.systemd` redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- systemctl manual, including `reload-or-restart`: https://www.freedesktop.org/software/systemd/man/systemctl.html
- systemd service unit documentation for `ExecReload`: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- NGINX process control documentation: https://nginx.org/en/docs/control.html
- PostgreSQL configuration and reload documentation: https://www.postgresql.org/docs/18/config-setting.html
- PostgreSQL `pg_settings.pending_restart` documentation: https://www.postgresql.org/docs/15/view-pg-settings.html
- Apache HTTP Server stopping and restarting documentation: https://httpd.apache.org/docs/current/stopping.html
- HAProxy Enterprise service management documentation: https://www.haproxy.com/documentation/haproxy-enterprise/administration/manage-service/
- Docker daemon documentation and signal reload behavior: https://docs.docker.com/reference/cli/dockerd/
- Docker daemon logs documentation with SIGHUP reload example: https://docs.docker.com/engine/daemon/logs/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- systemd-journald service documentation: https://www.freedesktop.org/software/systemd/man/systemd-journald.service.html

## Issues Found
- The post said `state: reloaded` directly runs `systemctl reload nginx` and that reload usually sends a signal. Updated the explanation to say Ansible asks systemd to reload the unit, and systemd runs the unit's `ExecReload` action. For Nginx, that commonly sends `SIGHUP`.
- The post said Apache reload may use `SIGWINCH`. Updated this to `SIGUSR1`, which is the documented graceful restart signal for Apache HTTP Server. `SIGWINCH` is associated with graceful stop.
- The signal examples used `ansible.builtin.command` with shell command substitution. Updated those tasks to `ansible.builtin.shell` because the command module does not process shell substitutions like `$()`.
- The handler-decision example claimed an Nginx `worker_processes` change requires a full restart. Replaced it with a systemd service override example, which is outside the Nginx config reload path and correctly uses `daemon_reload: true` before restart.
- The service reload table said Docker has no reload support and must restart for daemon config. Updated it to partial support because Docker documents Linux SIGHUP reload behavior for some daemon configuration, while other settings still require restart.

## Review Notes
- `ansible.builtin.systemd` remains valid as a backward-compatible alias, though the current module name is `ansible.builtin.systemd_service`.
- Several service examples are distribution-dependent, especially service names such as `apache2` versus `httpd` and PostgreSQL unit names. The post already frames these as examples rather than universal values.

# Validation Summary: How to Use Ansible to Configure Log Rotation for Web Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- logrotate
- Nginx
- Apache HTTP Server
- Gunicorn
- Linux cron
- Linux shell commands

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.package_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- logrotate configuration manual: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html
- Nginx process control documentation: https://nginx.org/en/docs/control.html
- Apache HTTP Server log rotation documentation: https://httpd.apache.org/docs/current/logs.html
- Gunicorn signal handling documentation: https://gunicorn.org/signals/
- Local `logrotate --help` output for current CLI flags.

## Issues Found
- The Nginx and Apache deployment tasks checked `ansible_facts.packages`, but the role did not gather package facts. Added a `package_facts` task before those conditional checks.
- The monitoring script was copied to `/opt/scripts/check-log-disk.sh`, but the parent directory was not guaranteed to exist. Added a task to create `/opt/scripts`.
- The shared rotation variable was named `log_retention_days`, but logrotate's `rotate` directive is a count of rotations, not necessarily days when weekly or monthly rotation is selected. Renamed it to `log_rotate_count` and updated template defaults.
- The logrotate test condition had ambiguous filter precedence. Added parentheses so stderr is lowercased before checking for `error`.
- The Gunicorn template used `HUP` to reopen log files. Gunicorn documents `USR1` as the log-reopen signal, while `HUP` reloads configuration and workers. Updated the template and comment to use `USR1`.
- The size-based rotation explanation overstated `maxsize` as fully independent of the time-based schedule. Updated the wording to match logrotate behavior: `maxsize` can rotate before the scheduled interval when the size threshold is exceeded.

## Review Notes
- The role uses the `apt` module, so the example is directly applicable to Debian/Ubuntu-style systems. Supporting RPM-based systems would require additional package-manager branching.
- The emergency cleanup examples are syntactically valid, but truncating active logs can still affect applications that keep file descriptors open. Production use should be paired with service-specific reopen or reload behavior.

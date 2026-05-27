# Validation Summary: How to Use Ansible to Configure Logrotate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Logrotate
- Jinja2 templates
- Linux logging
- Shell commands
- Docker logging
- SELinux

## Sources Consulted
- logrotate 3.21.0 local man page: `man logrotate`
- Official logrotate manual source: https://github.com/logrotate/logrotate/blob/main/logrotate.8.in
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.debug` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Docker JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/

## Issues Found
- The application-specific example used `daily` and `size 100M` together, which is misleading because logrotate treats `size` as mutually exclusive with time interval options when it appears after the interval. Changed the variable and template output to `maxsize 100M` so the daily schedule and size threshold work together.
- The custom application example used `daily` with `size {{ item.max_size }}`. Changed it to `maxsize {{ item.max_size }}` for the same reason.
- The custom application example combined `copytruncate` with `create 0640 ...`; logrotate documents that `create` has no effect when `copytruncate` is used because the original file stays in place. Removed the ineffective `create` directive.
- The decision flow implied a time interval must be met before checking size. Updated it to describe rotation when either the configured time interval or size threshold is met.
- The size-based rotation example recommended running logrotate against Docker's internal JSON log files under `/var/lib/docker/containers`. Docker documents those files as intended for exclusive Docker daemon access, so the example was changed to a generic high-volume application log path.
- The global configuration comment said `rotate` kept weeks of backlogs, even though the rotation frequency is configurable. Changed the comment to "rotated log files."

## Review Notes
- Representative generated logrotate configurations were checked with `logrotate -d -s /dev/null` using local logrotate 3.21.0.
- Ansible was not installed in the local environment, so Ansible module usage was reviewed against official Ansible documentation rather than executed.

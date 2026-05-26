# Validation Summary: How to Use Ansible to Manage Log Rotation Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- logrotate
- Linux logging
- Docker JSON file logging
- Nginx log rotation
- PostgreSQL log rotation
- Jinja2 templates

## Sources Consulted
- logrotate manual page: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html
- logrotate upstream project: https://github.com/logrotate/logrotate
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Docker JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/

## Issues Found
- The Docker container example rotated files under `/var/lib/docker/containers/` with logrotate. Docker documents JSON log rotation through `json-file` logging driver options such as `max-size` and `max-file`, and notes that changed daemon defaults apply after restarting Docker and recreating containers. Replaced the logrotate file example with an Ansible task that manages `/etc/docker/daemon.json` logging options.
- The dynamic logrotate templates rendered both a time frequency and `size` when a size value was provided. logrotate treats `size` as mutually exclusive with time interval options, with the later directive taking precedence. Updated both templates to render `size` when size-based rotation is configured, otherwise render the time frequency.
- The validation task used a fragile stderr substring check that could miss real configuration errors if the error output contained `missingok`. Updated it to fail on a non-zero `logrotate --debug` return code.
- The summary said `postrotate` is critical for applications that hold log files open. That is only true for applications that can be signaled to reopen logs; applications that cannot reopen logs commonly use `copytruncate`. Reworded the statement accordingly.

## Review Notes
- The remaining Ansible examples use current fully qualified `ansible.builtin` module names and valid `copy`, `template`, `command`, and `file` module parameters.
- The local environment has logrotate 3.21.0 installed. Its `--debug` and `--force` flags match the post, and the edited YAML code blocks parse successfully.

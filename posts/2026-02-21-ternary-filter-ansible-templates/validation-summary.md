# Validation Summary: How to Use the ternary Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 templating
- Ansible filter plugins
- Ansible playbooks and template module
- Nginx configuration
- systemd unit files
- Docker Compose

## Sources Consulted
- Ansible `ansible.builtin.ternary` filter documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/ternary_filter.html
- Ansible filter plugin usage documentation: https://docs.ansible.com/projects/ansible/latest/plugins/filter.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Jinja template designer documentation: https://jinja.palletsprojects.com/en/stable/templates/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` and `name` top-level elements documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference for `restart`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification for `replicas` and resource limits: https://docs.docker.com/reference/compose-file/deploy/
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- logrotate manual page: https://manpages.debian.org/trixie/logrotate/logrotate.8.en.html

## Issues Found
- The post described the `ternary` filter as returning values for "truthy" and "falsy" input. The official Ansible documentation defines the input as a boolean expression that evaluates to `True` or `False`, so the wording was changed to "true" and "false."
- The Nginx SSL certificate examples referenced `ssl_cert_name` inside a `ternary` true branch. Ansible documents that filter argument values are evaluated before the filter returns a branch, so those examples could fail when `enable_ssl` is false but `ssl_cert_name` is undefined. The examples now apply `default('')` to `ssl_cert_name`.
- The playbook task selected `nginx-mainline` for non-Debian systems, which is not a generally valid package name across common non-Debian package managers. The example now uses `httpd` for non-Debian systems and updates the task name accordingly.
- The logrotate task used mode `0666`, but logrotate documentation says configuration files must not be group-writable or world-writable. The non-production example mode was changed to `0600`.
- The `data | ternary(data | to_nice_json, '{}')` example could fail if `data` was undefined because ternary arguments are evaluated before branch selection. The example now applies `default({})` before testing and formatting.
- The Docker Compose example used top-level `version: "3.8"`. Current Docker Compose documentation marks the top-level `version` property as obsolete and only informative, so it was removed.
- The third-argument section described a positional third argument for `None` or undefined handling. The official Ansible documentation exposes this as the `none_val` keyword parameter for `None`; undefined variables require `default(none)` first. The explanation and examples were corrected to use `none_val=...` with `default(none)`.

## Review Notes
- The remaining examples are illustrative snippets rather than complete deployable configurations. They assume the referenced variables are supplied elsewhere in the inventory, playbook, or template context.
- Ansible was not installed in the local environment, so validation was performed against official documentation rather than local `ansible-doc` output.

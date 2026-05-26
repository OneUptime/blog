# Validation Summary: How to Use Ansible Delegation for Multi-Tier Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, delegation, serial rolling updates, and failure handling
- Ansible built-in modules: `uri`, `shell`, `systemd`, `unarchive`, `template`, `pip`, `pause`, `fail`, `set_fact`
- Ansible `now()` function and `to_datetime` filter
- PostgreSQL backup and Ansible `community.postgresql.postgresql_ping`
- Django migration commands
- HAProxy Runtime API
- RabbitMQ Management HTTP API
- Redis CLI cache operations
- systemd service management

## Sources Consulted
- Ansible delegation and rolling updates documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible `now()` function documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible `to_datetime` filter documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/to_datetime_filter.html
- Ansible `uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.postgresql.postgresql_ping` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_ping_module.html
- HAProxy Runtime API `set server` documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- RabbitMQ Management HTTP API reference: https://www.rabbitmq.com/docs/4.1/http-api-reference
- Django `django-admin` and `manage.py` command reference: https://docs.djangoproject.com/en/6.0/ref/django-admin/

## Issues Found
- The deployment start time was stored with `now(utc=true).isoformat()` but later parsed with `to_datetime` without a format string. Ansible documents the default `to_datetime` format as `%Y-%m-%d %H:%M:%S`, so I changed the stored timestamp and duration calculation to use that documented format consistently.
- The integration test task would fail the play immediately on a non-zero exit code, preventing the maintenance-window cleanup and completion notification from running even though the notification text reports a failed test result. I set `failed_when: false` on the test task and added a final `fail` task after notification so cleanup still runs while preserving failure semantics.
- The `community.postgresql.postgresql_ping` example used the deprecated `db` alias. I changed it to the current `login_db` parameter.
- The RabbitMQ health check URL used `/api/healthchecks/node`, which does not match the current official Management HTTP API paths. I changed it to `/api/health/checks/ready-to-serve-clients`.
- The summary said load balancers were managed from the controller, but the playbook delegates HAProxy socket commands to the load balancer hosts. I corrected the wording to match the code.

## Review Notes
The remaining examples are environment-specific deployment snippets and assume matching inventory groups, release paths, HAProxy backend/server names, local test paths, Redis access, and service names. Ansible was not installed in the local workspace, so I could not run `ansible-playbook --syntax-check`; validation was performed against official documentation and by reviewing the YAML snippets directly.

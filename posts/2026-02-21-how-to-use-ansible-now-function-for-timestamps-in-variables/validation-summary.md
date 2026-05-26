# Validation Summary: How to Use Ansible now Function for Timestamps in Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 templating
- Python datetime/strftime formatting
- PostgreSQL pg_dump
- gzip
- systemd

## Sources Consulted
- Ansible documentation: The now function: get the current time - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible documentation: Templating (Jinja2) - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating.html
- Ansible documentation: ansible.builtin.set_fact module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible documentation: Controlling playbook execution with run_once - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible documentation: ansible.builtin.command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: ansible.builtin.find module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible documentation: ansible.builtin.file module - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible documentation: ansible.builtin.template module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: ansible.builtin.unarchive module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible documentation: ansible.builtin.systemd module redirect - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Python documentation: datetime strftime behavior - https://docs.python.org/3/library/datetime.html#strftime-and-strptime-behavior

## Issues Found
- Play-level timestamp variables were described as the way to keep `now()` consistent, but normal templated variables are lazily evaluated when used. Changed the examples and guidance to use `ansible.builtin.set_fact`, which Ansible documents as evaluating values on assignment.
- The backup and log rotation examples stored timestamps in `vars`, which could produce different values across later task evaluations. Moved those timestamps into initial `set_fact` tasks with `run_once: true`.
- The deployment example used `ansible_user_id` while `gather_facts: false` was set. Replaced it with `ansible_user | default('unknown')`.
- The timestamp arithmetic and format reference examples used `%s` with `strftime`. Python documents that supported `strftime` directives vary by platform, and `%s` is not one of the portable standard directives. Replaced those examples with `now(utc=true).timestamp() | int`.
- The log rotation example used `ansible.builtin.command` with a wildcard in `gzip {{ archive_dir }}/*_{{ rotation_timestamp }}.log`, but `command` does not process shell metacharacters such as `*`. Changed the compression task to loop over the exact archived file names.
- The best practices section said to use `cacheable: true` to keep the timestamp the same across hosts. `cacheable` only works with fact caching and is not needed for same-play host consistency. Changed the guidance to use `run_once: true` with `set_fact`.

## Review Notes
- Ansible was not installed in the local environment, so validation was performed against official Ansible and Python documentation rather than by executing the playbooks.
- `ansible.builtin.systemd` is currently a redirect to `ansible.builtin.systemd_service`; the existing example remains valid, but future posts could use `ansible.builtin.systemd_service` directly.

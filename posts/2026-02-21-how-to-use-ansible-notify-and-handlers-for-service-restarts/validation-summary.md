# Validation Summary: How to Use Ansible notify and Handlers for Service Restarts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible handlers and notify
- Ansible roles
- Ansible built-in modules: template, file, apt, unarchive, command, uri, systemd/systemd_service
- ansible-playbook CLI
- ansible.cfg
- systemd service management
- YAML

## Sources Consulted
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The post described handlers as running only at the end of the play and only once per play. Current Ansible documentation is more precise: handlers are automatically executed after `pre_tasks`, `roles`/`tasks`, and `post_tasks`, and after a handler flush they can be notified and run again later in the play. Updated the wording to say handlers run once per flush and do not run immediately after each notifying task.
- The Mermaid diagram labeled the handler execution point as "End of play". Updated it to "Handler flush" to avoid implying that handlers can only execute at one final play boundary.

## Review Notes
- The examples use the short `systemd` module name. Current Ansible documentation says `ansible.builtin.systemd` is an alias for `ansible.builtin.systemd_service`, with the FQCN recommended for documentation linking and avoiding collection name conflicts. This is technically valid, but future posts could use `ansible.builtin.systemd_service` for current best practice.

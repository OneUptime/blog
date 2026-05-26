# Validation Summary: How to Use Ansible Handlers to Restart Services on Config Change

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible handlers, notify, listen, and meta: flush_handlers
- Ansible roles
- ansible.builtin.template
- ansible.builtin.copy
- ansible.builtin.systemd / systemd_service
- ansible.builtin.uri
- Nginx service reloads and restarts
- systemd-managed services

## Sources Consulted
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible blocks documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Nginx process control documentation: https://nginx.org/en/docs/control.html
- Local syntax validation with ansible-core 2.17.14 for the handler block example.

## Issues Found
- The Nginx explanation said main nginx.conf changes such as worker_processes or error_log path need a full restart. Nginx official documentation says a HUP/reload re-reads configuration, opens new log files and listen sockets, starts new workers with the new configuration, and gracefully shuts down old workers. I changed the text to say Nginx can usually apply configuration changes with reload and that restart should be reserved for changes a specific service cannot reload.
- The rolling restart example used `listen` on a handler `block`. Local syntax validation with ansible-core 2.17.14 rejected this with `'listen' is not a valid attribute for a Block`. Because the task already notifies the handler by its name, I removed the invalid `listen` line.

## Review Notes
- The examples use `ansible.builtin.systemd`, which is retained as an alias for `ansible.builtin.systemd_service`. Future updates could switch to `ansible.builtin.systemd_service` to match the current documentation name, but the existing module name remains valid.
- Handler execution is accurate for the normal case: duplicate notifications are coalesced, handlers run in definition order, and `meta: flush_handlers` runs pending handlers early. After a handler has been flushed, it can be notified and run again later in the play.

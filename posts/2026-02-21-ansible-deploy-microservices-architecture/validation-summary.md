# Validation Summary: How to Use Ansible to Deploy Microservices Architecture

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible playbooks, roles, inventory, handlers, Vault, and rolling updates
- Node.js and npm deployment
- systemd service units
- Nginx reverse proxy and upstream configuration
- Redis and RabbitMQ service references
- PostgreSQL connection strings

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible playbook strategy and serial documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible community.general.npm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/npm_module.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible Vault usage documentation: https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_vault.html
- Node.js release schedule: https://github.com/nodejs/Release
- Node.js releases page: https://nodejs.org/en/about/previous-releases
- NodeSource distributions setup script repository: https://github.com/nodesource/distributions
- Nginx reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- systemd.exec EnvironmentFile documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html

## Issues Found
- The common role assigned `service_group` as the service user's primary group without creating that group first. Added a `group` task before the `user` task because Ansible's `user.group` parameter expects an existing primary group.
- The service role used NodeSource `setup_20.x`, but Node.js 20 is End-of-Life as of April 30, 2026. Updated the example to `setup_24.x`, which is an active LTS line on the validation date.
- The service role used the short `npm` module name. Current Ansible documentation places the npm module in `community.general`, so the task now uses `community.general.npm` and the post includes the collection installation command for `ansible-core` users.
- The service and API gateway tasks notified handlers that were not defined in the post. Added the `roles/service_base/handlers/main.yml` and `roles/api_gateway/handlers/main.yml` snippets and updated the project structure accordingly.
- The first service start could occur before systemd had reloaded the newly deployed unit file, because handlers run at the end of the play by default. Added `daemon_reload: yes` to the start task.
- The API gateway role deployed and enabled the Nginx site but did not ensure Nginx was enabled and running. Added an explicit `systemd` task for Nginx.
- The notification service play did not use `serial: 1`, even though the post describes rolling updates across services. Added `serial: 1` for consistency.
- Single-service deployment commands omitted `--ask-vault-pass` even though the shown service variables reference Vault-backed secrets. Added `--ask-vault-pass` to those commands.
- The project structure listed an unused `nginx-upstream.conf.j2` template. Removed it to keep the structure aligned with the shown role templates.

## Review Notes
The examples are now technically consistent with current Ansible and Node.js documentation. Future improvements could include a concrete `shared_infra` role implementation, Nginx config validation before reload, and service-discovery integration beyond static inventory-driven upstream generation.

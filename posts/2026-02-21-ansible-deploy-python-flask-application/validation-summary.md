# Validation Summary: How to Use Ansible to Deploy a Python Flask Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks, inventory, roles, modules, handlers, retries, serial deployment, and Vault
- Python Flask
- Gunicorn
- systemd service units
- Nginx reverse proxy configuration
- Ubuntu package management with apt

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible loops and retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible playbook strategy and serial documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Flask Gunicorn deployment documentation: https://flask.palletsprojects.com/en/stable/deploying/gunicorn/
- Flask changelog for environment variable deprecations/removals: https://flask.palletsprojects.com/en/stable/changes/
- Gunicorn deployment documentation: https://docs.gunicorn.org/en/latest/deploy.html
- Gunicorn run documentation: https://docs.gunicorn.org/en/latest/run.html
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The Gunicorn service could fail on a first deployment because Ansible started the newly written unit before systemd had reloaded unit files. Added `daemon_reload: yes` to the start/enable task.
- Gunicorn was bound to `0.0.0.0` while Nginx proxied to `127.0.0.1`, exposing the backend port directly. Changed the Gunicorn bind address to `127.0.0.1`.
- The article added a `.env` file but the systemd service did not load it, so those environment variables would not reach Gunicorn. Added `EnvironmentFile=-{{ app_dir }}/.env` to the service template.
- The environment template used `FLASK_ENV=production`, which is obsolete in current Flask. Replaced it with `FLASK_DEBUG=0`.
- The Nginx explanation implied the shown HTTP-only configuration performed SSL termination. Clarified that Nginx can handle SSL termination, while this example configures HTTP proxying and static files.
- The smoke test used `retries` and `delay` without an `until` condition even though the post lists Ansible 2.9+ as a prerequisite. Added an explicit `until` condition so the retry behavior works for older supported Ansible versions.
- The serial deployment section said `serial: 1` ensures availability. Softened this to say it helps availability when servers are behind a correctly configured load balancer.

## Review Notes
The tutorial remains a simplified deployment example. A production version could further improve security by using a Unix socket, adding TLS configuration, setting stricter systemd hardening options, validating Nginx configuration before reload, and handling load balancer draining explicitly during rolling deployments.

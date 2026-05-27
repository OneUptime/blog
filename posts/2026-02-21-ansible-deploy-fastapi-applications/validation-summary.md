# Validation Summary: How to Use Ansible to Deploy FastAPI Applications

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Python virtual environments and pip
- FastAPI ASGI applications
- Uvicorn workers
- systemd service units
- Nginx reverse proxy configuration
- UFW firewall automation
- cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.meta` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/meta_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- FastAPI server workers documentation: https://fastapi.tiangolo.com/deployment/server-workers/
- Uvicorn deployment documentation: https://www.uvicorn.org/deployment/
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The playbook used `ansible.builtin.git` but did not install the `git` command-line tool required on managed hosts. Added `git` to the system dependency list.
- The systemd service claimed to deploy Uvicorn workers but used `python -m {{ app_name }}.main`, which would only work for applications with custom module entrypoint code and did not configure Uvicorn or workers. Changed `ExecStart` to run `uvicorn {{ app_name }}.main:app` with explicit host, port, and worker settings.
- The playbook notified `reload systemd` after writing the unit file, but the following start task could run before handlers executed. Added `daemon_reload: true` to the enable/start task so systemd reads the new unit before starting it.
- The health check could run before notified service restarts and nginx reloads were applied. Added a `meta: flush_handlers` task before the health check so verification checks the updated deployment.
- The summary overstated idempotence by saying each task is idempotent. Reworded it to say the playbook is designed to be run repeatedly and that handlers apply restarts when notified.

## Review Notes
- The examples are Debian/Ubuntu-oriented because they use packages such as `python3-venv`, `libpq-dev`, and the `/etc/nginx/sites-available` layout.
- The `community.general.ufw` example requires the `community.general` collection and the target host's `ufw` package.
- The deployment assumes the FastAPI application exposes an `app` object from `{{ app_name }}.main` and provides a `/health` endpoint.

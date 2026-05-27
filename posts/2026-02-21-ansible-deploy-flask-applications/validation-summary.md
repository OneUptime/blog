# Validation Summary: How to Use Ansible to Deploy Flask Applications

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Python virtual environments and pip
- Flask WSGI deployment
- Gunicorn
- systemd services
- Nginx reverse proxy configuration
- UFW firewall management
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Flask Gunicorn deployment documentation: https://flask.palletsprojects.com/en/stable/deploying/gunicorn/
- Nginx reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy

## Issues Found
- The description claimed the guide covered static files, but no static-file deployment or serving configuration was present. Updated the description to match the actual content.
- The deployment used `ansible.builtin.git` but did not install the required `git` command-line tool on target hosts. Added `git` to the system dependency list.
- The service configuration described a Gunicorn/WSGI deployment but started the app with `python -m {{ app_name }}.main`, which would not provide the production WSGI server behavior described by Flask's deployment guidance. Added a Gunicorn pip install task and changed `ExecStart` to run Gunicorn against `{{ app_name }}.main:app`.
- The health-check status message advertised `http://{{ inventory_hostname }}:{{ app_port }}` even though Gunicorn is bound to `127.0.0.1` behind Nginx. Updated the message to show the externally reachable Nginx URL.

## Review Notes
The examples are Debian/Ubuntu-oriented because they use packages such as `python3-venv`, `libpq-dev`, `libssl-dev`, Nginx `sites-available`/`sites-enabled`, and UFW. The Gunicorn command assumes the Flask application object is exposed as `app` in `{{ app_name }}.main`; projects using an app factory or a different module layout should adjust the import target.

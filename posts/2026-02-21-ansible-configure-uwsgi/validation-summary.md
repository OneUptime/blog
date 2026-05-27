# Validation Summary: How to Use Ansible to Configure uWSGI Application Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Python virtual environments
- uWSGI
- WSGI applications
- systemd services
- SSH configuration
- UFW firewall rules
- Cron scheduling
- HTTP health checks

## Sources Consulted
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- uWSGI Python/WSGI quickstart: https://uwsgi.readthedocs.io/en/latest/WSGIquickstart.html
- uWSGI native HTTP support documentation: https://uwsgi-docs.readthedocs.io/en/latest/HTTP.html

## Issues Found
- The original service template started `python -m {{ app_name }}` rather than uWSGI, so the post did not actually configure a uWSGI application server. Changed the systemd `ExecStart` to run `uwsgi --ini {{ app_dir }}/uwsgi.ini` and added a uWSGI configuration template with `http`, `chdir`, `module`, `callable`, `master`, `processes`, and `threads` settings.
- The original playbook created a Python virtual environment but did not install `uwsgi`. Added `uwsgi` to the pip installation task.
- The application dependency task referenced `requirements_file.stat.exists` without defining `requirements_file`. Added an `ansible.builtin.stat` task for `{{ app_dir }}/requirements.txt`.
- The playbook notified a `daemon_reload` handler after templating a systemd unit, but then immediately enabled and started the service before handlers would normally run. Added `daemon_reload: true` to the start task and updated examples to use the current `ansible.builtin.systemd_service` FQCN.
- The `python_version` variable was unused and implied Python 3.11-specific setup that the package and virtualenv tasks did not enforce. Removed it.
- The summary claimed every step was idempotent, but `state: latest` and command examples are not guaranteed to be side-effect-free across runs. Reworded the claim to say the core setup uses repeatable Ansible modules.
- The SSH hardening example only matched uncommented settings and used the Debian/Ubuntu-incompatible `sshd` service name while the rest of the package examples are Debian-oriented. Updated the regexes to match commented defaults and changed the handler to restart `ssh`.
- The cron example copied `/opt/scripts/compliance_scan.sh` without first ensuring `/opt/scripts` exists. Added a directory creation task before the copy task.

## Review Notes
- The post remains a generic deployment template. Users still need to set `uwsgi_module`, `uwsgi_callable`, and the `/health` route to match their application.
- Package names such as `build-essential`, `python3-venv`, and service name `ssh` are Debian/Ubuntu-oriented. Cross-distribution support would require OS-specific variables or conditionals.
- The examples use `community.general.ufw`, so the `community.general` collection must be available for the firewall tasks.

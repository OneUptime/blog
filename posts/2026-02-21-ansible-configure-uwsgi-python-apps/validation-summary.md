# Validation Summary: How to Use Ansible to Configure uWSGI for Python Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- uWSGI
- Python WSGI applications
- systemd
- logrotate

## Sources Consulted
- uWSGI Emperor documentation: https://uwsgi.readthedocs.io/en/latest/Emperor.html
- uWSGI systemd documentation: https://uwsgi.readthedocs.io/en/latest/Systemd.html
- uWSGI options reference: https://uwsgi.readthedocs.io/en/latest/Options.html
- uWSGI management and signal documentation: https://uwsgi.readthedocs.io/en/latest/Management.html
- uWSGI stats server documentation: https://uwsgi-docs.readthedocs.io/en/latest/StatsServer.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/pip_module.html

## Issues Found
- The Emperor vassal task set `loop_control.loop_var: app` but still used `{{ item.name }}` in the destination path. Updated it to `{{ app.name }}` so the task uses the actual loop variable documented by Ansible.
- Single-app mode installed `uwsgi` into the virtual environment and launched `{{ venv_dir }}/bin/uwsgi`, while the shared app config loaded the Debian `python3` plugin. Updated the service to use `/usr/bin/uwsgi`, matching the system-wide `uwsgi` and `uwsgi-plugin-python3` installation used by the role.
- The logrotate postrotate command expected `/run/uwsgi/*.pid`, but the uWSGI template did not create pidfiles. Added `safe-pidfile` and `log-reopen` to make reload-based log reopening work as intended.
- `uwsgi_http_port` was presented as an active setting but was not consumed by the template. Changed it to an optional commented variable and added a conditional `http` directive when an app provides `http_port`.

## Review Notes
The examples assume a Debian/Ubuntu-style package layout with `/usr/bin/uwsgi`, `uwsgi-plugin-python3`, `apt`, and `www-data`. The post is technically valid for that target environment, but future revisions could explicitly state the operating-system assumption.

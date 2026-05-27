# Validation Summary: How to Use Ansible to Install Python from Source

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: package, get_url, unarchive, command, file, pip, stat, template, systemd, uri, setup, debug, timezone, hostname, lineinfile, service, copy, cron
- Python source builds on Unix-like systems
- Python virtual environments
- systemd service units
- UFW via community.general

## Sources Consulted
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Python 3.11 Unix platform documentation: https://docs.python.org/3.11/using/unix.html
- Python 3.11 configure documentation: https://docs.python.org/3.11/using/configure.html
- Python Developer Guide setup and building documentation: https://devguide.python.org/getting-started/setup-building.html
- Python 3.11.15 source archive index: https://www.python.org/ftp/python/3.11.15/

## Issues Found
- The original installation playbook did not install Python from source. It installed distribution Python packages and created a virtual environment with system `python3`, which contradicted the title and description. I added tasks to download the Python source archive, extract it, run `./configure`, compile it with `make`, and install it with `make altinstall`.
- The original description claimed the playbook worked on any Linux distribution, but the dependency package names were Debian/Ubuntu-specific. I changed the description to say Debian or Ubuntu servers.
- The original `python_version` value was only `3.11`, which is not enough to form a real Python source archive URL. I changed it to `3.11.15` and added a separate `python_major_minor` variable for interpreter paths like `/usr/local/bin/python3.11`.
- The original playbook referenced `requirements_file.stat.exists` without registering `requirements_file`. I added a `stat` task before installing application dependencies.
- The original virtual environment used `python3 -m venv`, which would use the system Python rather than the compiled source installation. I changed it to use `/usr/local/bin/python{{ python_major_minor }} -m venv`.
- The original systemd enable/start task could run before systemd had reloaded a newly created unit file. I added `daemon_reload: true` to that task.

## Review Notes
- The source-build tasks use Ansible `command` with `creates` guards for idempotence. They will not automatically rebuild if the same source directory already exists with changed configure flags; rebuilding would require removing the existing build directory or using a more advanced role structure.
- The Python archive download does not include checksum verification. Adding a pinned checksum or signature verification would improve supply-chain integrity.
- The playbook still assumes the application user exists and that `/opt/{{ app_name }}/requirements.txt` is deployed by another task or process before dependency installation.
- `ansible-playbook` was not installed in the local review environment, so the snippets were reviewed against official documentation rather than executed locally.

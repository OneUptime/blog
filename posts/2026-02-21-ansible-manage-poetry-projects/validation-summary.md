# Validation Summary: How to Use Ansible to Manage Poetry Projects

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible
- Python
- Poetry
- systemd
- Nginx
- UFW
- SSH
- Cron

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.systemd` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Poetry installation documentation: https://python-poetry.org/docs/#installation
- Poetry CLI documentation for `install` and `sync`: https://python-poetry.org/docs/cli/
- Poetry dependency group and synchronization documentation: https://python-poetry.org/docs/managing-dependencies/
- Poetry configuration documentation for `virtualenvs.in-project`: https://python-poetry.org/docs/configuration/

## Issues Found
- The application deployment example used `ansible.builtin.pip` with `requirements.txt`, so it did not actually manage a Poetry project or use `poetry.lock`. Replaced that with the official Poetry installer, project-local Poetry virtual environment configuration, and `poetry sync --only main` to synchronize dependencies from the lock file.
- The service file pointed to `{{ app_dir }}/venv/bin/python`, but the corrected Poetry workflow creates the application virtual environment at `{{ app_dir }}/src/.venv`. Updated `ExecStart` accordingly.
- The `ansible.builtin.git` task requires the Git CLI on the target host. Added `git` to the system dependencies.
- The summary said the playbook performed generic virtual environment management. Updated it to describe Poetry dependency synchronization.
- The Common Use Cases text referred to "this module", but the post is not about a specific Ansible module. Updated those references to Ansible patterns.

## Review Notes
- The UFW example uses `community.general.ufw`, which is not part of `ansible-core`; the `community.general` collection and the target host's `ufw` package must be installed.
- The Poetry installer is downloaded without a pinned checksum in this illustrative playbook. For stricter production hardening, pinning the installer or installing a pinned Poetry version would reduce supply-chain drift.

# Validation Summary: How to Use Ansible --start-at-task to Resume Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible-playbook CLI
- Ansible task execution controls (`--start-at-task`, `--step`, `--list-tasks`, `--tags`, `--limit`)
- Ansible retry files
- Ansible built-in modules (`apt`, `copy`, `file`, `git`, `pip`, `set_fact`, `shell`, `systemd`, `template`, `user`)

## Sources Consulted
- Ansible Community Documentation: Executing playbooks for troubleshooting: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_startnstep.html
- Ansible Community Documentation: ansible-playbook CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Tags: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: ansible.builtin.pip module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible Community Documentation: ansible.builtin.apt module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: Configuration settings / retry files: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Local verification with ansible-core 2.21.0 installed in a temporary target directory for CLI behavior checks.

## Issues Found
- The deployment example used `ansible.builtin.pip` with `virtualenv` but did not install a virtual environment provider. Current Ansible documentation says the default `virtualenv_command` is `virtualenv`, and a virtualenv provider must be present when creating a new virtualenv. I added `python3-venv` to the apt package list and set `virtualenv_command: python3 -m venv`.
- The post treated retry files as generally available, but current Ansible defaults `RETRY_FILES_ENABLED` to `False`. I updated the retry-file examples and summary to state that `deploy-app.retry` exists only when retry files are enabled.
- The post did not mention the official `--start-at-task` limitation for dynamically included tasks and roles. I added a caveat that `--start-at-task` cannot jump into tasks loaded through `include_tasks` or `include_role`, and that static imports are needed for that behavior.

## Review Notes
- YAML snippets were parsed successfully after the edits.
- Local ansible-core 2.21.0 checks confirmed `--start-at-task`, exact task-name matching, multi-play behavior, `--step`, `--tags`, `--limit`, `--list-tasks`, and the current retry-file default.

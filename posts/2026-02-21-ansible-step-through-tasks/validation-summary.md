# Validation Summary: How to Step Through Ansible Playbook Tasks One by One

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible playbooks
- Ansible step mode
- Ansible check mode and diff mode
- Ansible debugger
- Ansible built-in modules: apt, deb822_repository, template, service, uri, debug

## Sources Consulted
- Ansible Core documentation: Executing playbooks for troubleshooting, including `--step` and `--start-at-task`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_startnstep.html
- Ansible CLI documentation for `ansible-playbook` options including `--step`, `--check`, `--diff`, `--limit`, and `--start-at-task`: https://docs.ansible.com/ansible/2.9/cli/ansible-playbook.html
- Ansible Community documentation: Validating tasks with check mode and diff mode: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible Community documentation: Debugging tasks and debugger commands: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_debugger.html
- Ansible Community documentation: ansible.builtin.apt_key module deprecation notes: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible Community documentation: ansible.builtin.deb822_repository module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible Community documentation: Retrying tasks with `retries`, `delay`, and `until`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html

## Issues Found
- The walkthrough used `apt_key` with `apt_repository`. The `apt_key` module relies on the deprecated `apt-key` command, and current Ansible documentation recommends `deb822_repository` as the replacement for `apt_repository` plus `apt_key` combinations. I replaced the key and repository tasks with a `deb822_repository` task and added an `apt` task to install the documented `python3-debian` dependency.
- The debugger transcript changed `task_vars` and then ran `redo` immediately. Ansible requires `update_task` after changing `task_vars` and before `redo`. I added the missing `update_task` command to the transcript.

## Review Notes
- The `--step` behavior, `y` / `n` / `c` choices, `--start-at-task`, `--limit`, `--check`, and `--diff` usage were consistent with Ansible documentation.
- The post uses short module names, which Ansible still supports. Official docs recommend fully qualified collection names for linking clarity and avoiding name conflicts, but short names are valid in normal playbooks.

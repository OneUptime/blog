# Validation Summary: How to Use Ansible --check Mode to Test Playbooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible check mode and diff mode
- Ansible built-in modules: command, shell, raw, script, apt, template, file, service, get_url, unarchive, assert, debug
- GitLab CI/CD configuration

## Sources Consulted
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.raw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible `ansible.builtin.script` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html

## Issues Found
- The post stated that `command`, `shell`, `raw`, and `script` do not support check mode. I corrected this to explain that `raw` has no check-mode support, while `command`, `shell`, and `script` have partial support through `creates` and `removes`.
- The section on tasks that only run in check mode implied that `check_mode: true` by itself makes a task run only during dry runs. I clarified that `when: ansible_check_mode` is what limits execution to check mode, while `check_mode: true` only forces check-mode behavior for a task that runs.
- The handler section said handlers are not triggered in check mode. I corrected it to state that changed tasks can notify handlers, and those handlers run in check mode without modifying the target.
- The practical example used a `.tar.gz` archive with `unarchive` in a check-mode-friendly example. Ansible documents check mode for `unarchive` as partial and not supported for gzipped tar files, so I changed the example archive to `.zip`.
- The limitations section said task A is skipped in check mode whenever task B depends on its created file. I changed this to say task A may be simulated or skipped, which matches modules that support check mode versus modules that do not.

## Review Notes
Ansible was not installed in the local environment, so commands were verified against current official Ansible documentation rather than local `ansible-playbook --help` output.

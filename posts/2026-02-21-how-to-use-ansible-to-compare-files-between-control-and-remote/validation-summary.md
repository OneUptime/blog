# Validation Summary: How to Use Ansible to Compare Files Between Control and Remote

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible check mode and diff mode
- Ansible built-in modules: `template`, `stat`, `slurp`, `assert`, `copy`, `command`, `file`, `debug`, `set_fact`
- Jinja2 expressions and Ansible lookup plugins
- Unix `diff`

## Sources Consulted
- Ansible documentation: Validating tasks with check mode and diff mode - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible documentation: `ansible.builtin.stat` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible documentation: `ansible.builtin.slurp` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible documentation: `ansible.builtin.template` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: `ansible.builtin.copy` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: `ansible.builtin.assert` module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible documentation: `ansible.builtin.file` lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible documentation: Delegation and `run_once` behavior - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- GNU diffutils manual: `diff` options and exit status - https://www.gnu.org/software/diffutils/manual/diffutils.html

## Issues Found
- The `slurp` content comparison example used `lookup('file', 'files/config.yml')`. The Ansible file lookup strips trailing whitespace by default (`rstrip=True`), so a byte-for-byte comparison against decoded `slurp` content could incorrectly report drift for files that only differ by the lookup's implicit trimming. Updated it to `lookup('ansible.builtin.file', 'files/config.yml', rstrip=False)`.
- The backup section was titled "Using the copy Module's Backup Feature" while the example used `ansible.builtin.template`. The `backup` parameter is valid for the template module, but the section title was inaccurate. Updated the heading to "Using the template Module's Backup Feature".

## Review Notes
- The examples use `yes` values for boolean task keywords. This remains valid YAML and Ansible syntax, though `true` is more common in newer examples.
- The checksum examples assume the compared files exist and are readable. For production audit playbooks, adding explicit missing-file handling would make the reporting clearer.

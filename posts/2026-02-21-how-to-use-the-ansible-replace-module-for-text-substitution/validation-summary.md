# Validation Summary: How to Use the Ansible replace Module for Text Substitution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.replace
- ansible.builtin.lineinfile
- ansible.builtin.find
- ansible.builtin.copy
- ansible.builtin.command
- Python regular expressions
- YAML playbook snippets

## Sources Consulted
- Ansible documentation: ansible.builtin.replace module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/replace_module.html
- Ansible documentation: ansible.builtin.lineinfile module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible source: ansible.builtin.replace module implementation and return value behavior, https://github.com/ansible/ansible/blob/devel/lib/ansible/modules/replace.py
- Python documentation: re regular expression operations, https://docs.python.org/3/library/re.html

## Issues Found
- The multi-line replacement section said to use multi-line mode but the example used `.*?` across lines without enabling DOTALL. Updated the explanation to reflect Ansible's `regexp` behavior and added `(?s)` to the multi-line block removal regex so `.` can match newlines.
- The trailing-whitespace example used `\\s+$`, which can match newline characters because Python `\\s` includes newlines. Changed it to `[ \\t]+$` so it removes only spaces and tabs at line ends.
- The backup examples referenced `replace_result.backup` and `nginx_update.backup`. The replace module returns `backup_file` when a backup is created, so those references were changed to `backup_file`.
- The Nginx validation rollback example registered the validation command but would stop the play on a nonzero `nginx -t` result before reaching the rollback task. Added `failed_when: false` so the rollback condition can run.

## Review Notes
The local environment did not have `ansible` or `ansible-doc` installed, so validation was performed against official Ansible documentation, the Ansible module source, and Python's regex documentation.

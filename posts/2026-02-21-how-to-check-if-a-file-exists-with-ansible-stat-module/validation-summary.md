# Validation Summary: How to Check if a File Exists with Ansible stat Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.stat module
- ansible.builtin.copy module
- ansible.builtin.file module
- ansible.builtin.command module
- ansible.builtin.assert module
- Ansible conditionals and registered variables

## Sources Consulted
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `now()` templating function documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html

## Issues Found
- The symlink section incorrectly said `stat` follows symlinks by default. Current Ansible documentation shows `follow` defaults to `false`, so the explanation was corrected and the example now uses `follow: false` for link metadata and `follow: true` for target checks.
- The broken symlink example used two `follow: false` checks, so it could not reliably detect a missing target. The target check now registers a `follow: true` result and removes the link only when the link exists, is a symlink, and the target does not exist.
- Several examples accessed attributes that may be absent when a path does not exist, such as `isdir`, `mode`, `checksum`, and `size`. These checks now use `default()` or single short-circuiting expressions where needed.
- The file size section warned that a "config file" was empty while checking a log file variable. The task name and message now correctly refer to the log file.
- The log rotation example notified a handler that was not defined in the standalone snippet. The undefined handler notification was removed.

## Review Notes
The post is technically relevant and the corrected examples align with current Ansible module documentation. `ansible-playbook` was not installed in the workspace, so local syntax execution was not performed.

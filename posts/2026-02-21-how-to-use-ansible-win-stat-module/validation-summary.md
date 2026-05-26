# Validation Summary: How to Use Ansible win_stat Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows collection
- ansible.windows.win_stat
- ansible.windows.win_copy
- ansible.windows.win_file
- ansible.windows.win_shell
- Windows / WinRM automation
- YAML playbooks
- PowerShell commands

## Sources Consulted
- Ansible Community Documentation: ansible.windows.win_stat module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_stat_module.html
- Ansible Community Documentation: ansible.windows.win_copy module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_copy_module.html
- Ansible Community Documentation: ansible.windows.win_file module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_file_module.html
- Ansible Community Documentation: ansible.windows.win_shell module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible Community Documentation: Installing collections, https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html

## Issues Found
- The introduction said `win_stat` reports file permissions. Current `win_stat` returns metadata such as owner and attributes, but permissions are handled by other Windows modules such as `win_acl`. Changed the wording to say "who owns it".
- The basic copy example used `remote_src: yes`. This still parses as a boolean in Ansible YAML, but current Ansible documentation uses explicit `true`/`false`; changed it to `remote_src: true`.
- The sample return data and symlink conditional used `islink`. Current `ansible.windows.win_stat` returns `islnk`; changed both references to `islnk`.
- The checksum section said `win_stat` does not compute checksums by default and that `checksum_algorithm` enables checksums. Current `win_stat` defaults `get_checksum` to `true` and uses SHA-1 unless another `checksum_algorithm` is selected. Updated the explanation and examples to use `get_checksum: true` with `checksum_algorithm: sha256`.
- The log rotation example had separate move tasks for age and size based on the same original stat result. If a log was both old and large, the second task could try to move a file already moved by the first task. Combined the conditions into one rotation task.
- The pre-deployment example declared `required_free_space_mb` but did not perform any free-space check. Removed the unused variable to avoid implying validation that the playbook does not do.
- The symbolic-link section described symlinks as introduced in newer Windows versions. Windows symbolic links are not new in modern Windows automation contexts, so the version-specific aside was removed.
- The production checksum tip said to only request checksums when needed. Because `win_stat` computes file checksums by default, changed the advice to set `get_checksum: false` when a checksum is not needed.

## Review Notes
The examples are instructional and assume normal playbook defaults such as fact gathering for `ansible_date_time`. The local environment did not have `ansible-galaxy` installed, so CLI verification was performed against official Ansible documentation rather than local `--help` output.

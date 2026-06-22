# Validation Summary: How to Fix 'Copy Module' File Transfer Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- ansible.builtin.copy
- ansible.builtin.file
- ansible.builtin.stat
- ansible.builtin.template
- ansible.builtin.get_url
- ansible.posix.synchronize
- SSH file transfer
- SELinux

## Sources Consulted
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible search paths documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible sh shell plugin documentation for remote_tmp: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sh_shell.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The copy module workflow diagram described a small-file/base64 versus large-file/SFTP branch that is not documented as copy module behavior. Updated it to describe checksum calculation, transfer through the configured SSH file transfer method, remote temporary file handling, optional validation, checksum verification, and final move.
- The source file search order was oversimplified and partly inaccurate. Updated the comments to match Ansible's documented relative-path search order for current roles, parent roles, task files, and play files.
- The large-file example used `async` with `ansible.builtin.copy`, but the copy module does not support async mode. Removed that example and kept supported alternatives using `synchronize` and `get_url`.
- The large-file timeout symptom used a privilege escalation prompt timeout, which is a become authentication issue rather than a file-size issue. Reworded the symptom and added a caveat.
- The copy checksum example used a SHA256 checksum file, but `ansible.builtin.copy.checksum` expects a SHA1 checksum. Changed the example to use a `.sha1` checksum file and clarified the comment.
- The line-ending note implied copy changes line endings. Reworded it to state that copy transfers files as-is, while template can generate files with a chosen newline sequence.
- The symlink replacement example referenced `ansible_facts['lnk_source']` without gathering it. Added a `stat` task and changed the condition to use `config_dest.stat.islnk`.
- The directory copy note incorrectly stated that directory copying requires `dest` to end with `/`. Updated it to explain that `dest` must be a directory and that the trailing slash on `src` controls whether contents are copied.
- The remote temp section said pipelining avoids temp files. Updated it to say pipelining reduces module transfer overhead, but copy still needs a usable remote temp directory for transferred files. Also changed the example section to `[connection]`.
- The validation-before-copy example ran `df` against `/etc/myapp`, which could fail before the custom validation message if the directory did not exist. Changed the disk check to use `/etc`.
- The validate example attempted to restore from a `.bak` file that the task never created, and copy validation fails before replacing the destination. Simplified it to a supported `copy` task with `backup: yes` and `validate`.

## Review Notes
The remaining examples are broadly correct for current Ansible documentation. The `synchronize` examples assume the `ansible.posix` collection and rsync are available, as documented by Ansible.

# Validation Summary: How to Use Ansible Ad Hoc Commands to Run Shell Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.raw
- Ansible callback plugins
- community.mysql.mysql_db
- Linux shell commands

## Sources Consulted
- Ansible ad hoc command guide: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/shell_module.html
- ansible.builtin.raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible stdout callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- community.mysql.mysql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html

## Issues Found
- The `command` module examples said redirects fail. In practice, `>` is passed as a literal argument because no shell interprets it, so the post now says it will not redirect output.
- The pipe failure example included an overly specific error message. The post now explains that the pipe is passed as a literal argument.
- Several `shell` examples used double quotes around ad hoc arguments containing `$` or command substitution, which would allow the local shell to expand them before Ansible sends the command to the remote host. Those examples now use single-quoted ad hoc arguments where needed.
- The bash executable example used `ansible_shell_executable` as an extra variable. The post now uses the shell module's `executable=/bin/bash` parameter, which is the documented module parameter for changing the shell used by that command.
- The `creates` and `removes` comments/examples were reversed. They now match Ansible's documented behavior: `creates` skips when the file exists, and `removes` skips when the file does not exist.
- The JSON callback example used `ANSIBLE_STDOUT_CALLBACK=json` without enabling ad hoc callbacks. It now uses `ANSIBLE_LOAD_CALLBACK_PLUGINS=1` with the documented `ansible.posix.json` stdout callback.
- The MySQL module example used the short legacy-style `mysql_db` name. It now uses the current fully qualified collection name `community.mysql.mysql_db`.

## Review Notes
- Ansible's `command` module in ansible-core 2.16 and later has `expand_argument_vars=true` by default, but it still does not invoke a shell or support shell operators, pipes, redirects, or glob expansion.
- The examples assume the relevant Linux utilities and Ansible collections are installed on the control node and managed hosts.

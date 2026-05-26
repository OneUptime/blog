# Validation Summary: How to Use the Ansible shell Module for Complex Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible `ansible.builtin.shell` module
- Ansible playbooks, task environment, `changed_when`, and `failed_when`
- POSIX shell features including pipes, redirection, globbing, environment variables, and command chaining
- Common Linux/Unix command-line tools including `ps`, `du`, `sort`, `awk`, `grep`, `find`, `tar`, `curl`, `tail`, `uniq`, `wc`, and `systemctl`

## Sources Consulted
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible remote environment documentation: https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Ansible error handling, `failed_when`, and `changed_when` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- GNU Coreutils manual for `du`, `sort`, `tail`, `wc`, and `date`: https://www.gnu.org/software/coreutils/manual/coreutils.html
- GNU Grep manual: https://www.gnu.org/software/grep/manual/grep.html
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- GNU Awk User's Guide: https://www.gnu.org/software/gawk/manual/gawk.html
- GNU Tar manual: https://www.gnu.org/software/tar/manual/html_node/

## Issues Found
- The redirection example used single quotes around `$(date)`, which would write the literal text `$(date)` instead of expanding the command substitution. Changed the command to use double quotes so the shell expands the timestamp.
- The nginx reload example checked for `signal process started` in stdout, but `nginx -t` typically writes diagnostics to stderr and `systemctl reload nginx` commonly produces no stdout. Changed `changed_when` to use the successful return code because the reload is attempted whenever the config test succeeds.
- The directory creation example used `changed_when: "'mkdir' in dir_result.cmd"`, which is always true because the registered command string always contains `mkdir`. Changed the command to emit `CHANGED` only when it creates the directory and changed the condition to inspect stdout.

## Review Notes
- The core Ansible claims are correct: `ansible.builtin.shell` runs commands through `/bin/sh` by default, supports `cmd`, `chdir`, `creates`, `removes`, and `executable`, and is appropriate when shell features such as pipes, redirects, globbing, or command chaining are required.
- Several examples are Linux/GNU-oriented, such as `ps aux --sort=-%mem` and `sort -rh`. They are reasonable for the target DevOps context, but may need adjustment on non-GNU Unix systems.
- The post correctly recommends quoting templated variables before passing them to `shell`; Ansible's own documentation recommends the `quote` filter for this.

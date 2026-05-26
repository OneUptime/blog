# Validation Summary: How to Use Ansible to Run Commands in a Specific Shell

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.script
- Ansible inventory variables
- ansible.cfg
- Bash
- POSIX sh
- zsh
- Shell startup files and environment variables

## Sources Consulted
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.script module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- Ansible shell plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/shell.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- GNU Bash Reference Manual, Bash Startup Files: https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files
- GNU Bash Reference Manual, set builtin and shell options: https://www.gnu.org/software/bash/manual/bash.html
- Ubuntu Dash as /bin/sh documentation: https://wiki.ubuntu.com/DashAsBinSh

## Issues Found
- The `ansible.cfg` example described `[defaults] executable = /bin/bash` as simply setting the default shell for the `shell` module. Ansible documents this setting as the shell used for Ansible's remote execution needs, so the wording was changed to make clear that it affects Ansible shell usage more broadly and should be used only when target hosts consistently support it.
- The Bash login shell examples described `bash -l` as loading the "full login environment" and implied that login shells directly load `.bashrc`. GNU Bash documents login shells as reading `/etc/profile` and then the first readable file among `~/.bash_profile`, `~/.bash_login`, and `~/.profile`; `.bashrc` is read by interactive non-login shells unless sourced by a profile. The wording and comments were corrected.
- The explanation of `set -e` said it exits immediately if any command fails. Bash `errexit` has documented exceptions, so the wording was corrected to say it exits on many unhandled command failures with exceptions for contexts such as tests, conditional lists, and parts of pipelines.

## Review Notes
The examples use Linux paths such as `/bin/bash` and `/bin/zsh`; on some systems the shell may be under `/usr/bin`, so production playbooks may need host-specific discovery or inventory variables. Local Ansible CLI verification was not possible because `ansible`, `ansible-doc`, and `ansible-config` are not installed in this environment; the review was completed against official online documentation.

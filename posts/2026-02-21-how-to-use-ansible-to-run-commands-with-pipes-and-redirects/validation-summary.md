# Validation Summary: How to Use Ansible to Run Commands with Pipes and Redirects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.command` module
- Ansible `ansible.builtin.shell` module
- Unix shell pipelines and redirection
- Bash features including here-strings, process substitution, and `pipefail`
- Standard Unix tools including `grep`, `awk`, `sort`, `uniq`, `tee`, `mkfifo`, `find`, and `wc`

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- GNU Bash Manual, Pipelines: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- GNU Bash Manual, Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- GNU Bash Manual, Process Substitution: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
- GNU Coreutils Manual, `tee`: https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html

## Issues Found
- The `pipefail` example used `cat /var/log/app/important.log | grep "CRITICAL" | wc -l` while also allowing return code `1` as the expected "no matches" case. With Bash `pipefail`, a failed `cat` can also leave the pipeline with return code `1` when `grep` receives no input, so the task could treat a missing or unreadable file as success. Changed the command to `grep "CRITICAL" /var/log/app/important.log | wc -l`, preserving the pipe while allowing `grep` return code `1` to mean no matches and return code `2` to represent an actual grep/file error.

## Review Notes
- The post correctly explains that Ansible's `command` module does not process shell metacharacters such as `<`, `>`, and `|`, and that `shell` is required when those shell features are needed.
- The examples rely on Unix/Linux command behavior and Bash-specific features where noted. The `executable: /bin/bash` examples are appropriate for here-strings, process substitution, and `set -o pipefail`.

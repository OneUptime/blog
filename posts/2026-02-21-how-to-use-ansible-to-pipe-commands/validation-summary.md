# Validation Summary: How to Use Ansible to Pipe Commands

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.shell module
- ansible.builtin.command module
- Unix shell pipelines
- Bash pipefail
- GNU/Linux command-line tools: ps, ss, grep, awk, sed, find, df, base64, xargs, tee

## Sources Consulted
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- GNU Bash Reference Manual, Pipelines: https://www.gnu.org/software/bash/manual/html_node/Pipelines
- GNU Findutils xargs options documentation: https://www.gnu.org/software/findutils/manual/html_node/find_html/xargs-options.html
- GNU Coreutils base64 documentation: https://www.gnu.org/software/coreutils/manual/html_node/base64-invocation.html
- Local GNU/Linux command help output for ss, ps, df, base64, and xargs

## Issues Found
- The process-counting task was labeled "Count running processes" even though `ps aux | wc -l` counts all listed processes plus the header. Changed the task name to "Count processes" to match the command.
- The safe pipeline fallback used `grep ... | wc -l || echo "0"` with `set -o pipefail`, which prints two zero lines when `grep` fails or finds no matches because `wc -l` still emits `0`. Changed the fallback to `|| true` so the task returns success without duplicating output.
- The `tee` logging example wrote files under `/tmp` while using `changed_when: false`. Changed it to `changed_when: true` because the task creates or updates files on the remote host.
- The decode-and-write example interpolated `encoded_config` directly inside a shell command. Changed it to `printf '%s' {{ encoded_config | quote }} | base64 -d ...` to follow Ansible's documented shell quoting guidance and avoid `echo` newline/option edge cases.
- The process-kill `xargs` example could report changed when `pgrep` found no matching process because the pipeline status came from `xargs -r`. Changed it to capture `pgrep` output first and exit nonzero when there are no matches, while keeping `failed_when: false`.
- The batch rename `xargs` example was unsafe for unusual filenames and used a broad `sed s/.old/.archived/` pattern where `.` matched any character. Changed it to use `find -print0`, `xargs -0 -r`, and shell parameter expansion `${1%.old}.archived`.

## Review Notes
The post is Linux-oriented. Some commands and flags shown, such as `ss`, `ps --sort`, `find -printf`, `base64 -w`, and `xargs -r`, are common on GNU/Linux systems but are not portable to every Unix-like target without adjustment.

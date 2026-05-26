# Validation Summary: How to Use Ansible failed_when for Custom Failure Conditions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `failed_when` and `changed_when`
- Ansible `command`, `shell`, `uri`, `stat`, `file`, and `debug` modules
- Jinja2 expressions and filters in Ansible conditionals
- GNU `grep`, GNU `df`, `systemctl`
- PostgreSQL `pg_dump`, `pg_restore`, and `psql`

## Sources Consulted
- Ansible Community Documentation: Error handling in playbooks, including `failed_when` list semantics and explicit `or` expressions: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible Community Documentation: `ansible.builtin.command` module, including return values and shell metacharacter limitations: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: `ansible.builtin.uri` module return values such as `content`, `elapsed`, and `status`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: `ansible.builtin.stat` module return values, including `stat.exists` and `stat.size`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- GNU Grep Manual: exit status values for matches, no matches, and errors: https://www.gnu.org/software/grep/manual/html_node/Exit-Status.html
- GNU Coreutils Manual: `df --output` support: https://www.gnu.org/software/coreutils/manual/coreutils.html
- PostgreSQL Documentation: `pg_dump` custom format and `--file` usage: https://www.postgresql.org/docs/17/app-pgdump.html
- PostgreSQL Documentation: `pg_restore --list` for inspecting archive contents: https://www.postgresql.org/docs/17/app-pgrestore.html
- systemd `systemctl` manual: `is-active` service state checks: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The introduction said Ansible decides task failure from the return code of the underlying module. This was too broad because not all modules are command-return-code based. Updated it to describe command-style tasks, matching Ansible's documented distinction between nonzero command return codes and module failures.
- The disk usage example used `ansible.builtin.command` with a shell pipeline (`| tail -1`). The command module does not process shell metacharacters, so the example would not run as described. Updated it to call `df --output=pcent /` directly and read the last line from `stdout_lines`.
- The backup validation example referenced `backup_file.stat.size` in the debug message and failure condition without first handling a missing file. Since `stat.size` is only returned when the path exists and can be read, a missing dump could cause an undefined-variable error instead of the intended validation failure. Updated the message to use `default(0)` and the failure condition to check `not backup_file.stat.exists`.
- The cleanup example used `ansible.builtin.command` with a glob path (`/tmp/app-*`). The command module does not perform shell glob expansion, so the cleanup might not target matching paths. Updated the example to use `ansible.builtin.shell`.

## Review Notes
The remaining examples align with the current Ansible documentation for `failed_when`: lists of conditions are combined with implicit AND, explicit OR should be written in a single expression, and registered result fields such as `rc`, `stdout`, `stderr`, `content`, `elapsed`, `status`, and `json` are appropriate for the modules shown.

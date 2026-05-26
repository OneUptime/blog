# Validation Summary: How to Use Ansible when with Command Return Codes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.systemd / systemd
- Linux command return codes
- grep, diff, curl, pg_isready, pgrep, dpkg-query, ss

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible error handling documentation for failed_when and changed_when: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible common return values documentation: https://docs.ansible.com/ansible/latest/reference_appendices/common_return_values.html
- Ansible systemd/systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- GNU grep manual, exit status: https://www.gnu.org/software/grep/manual/html_node/Exit-Status.html
- GNU diffutils manual, diff exit status: https://www.gnu.org/software/diffutils/manual/
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- curl exit code documentation: https://everything.curl.dev/cmdline/exitcode.html
- Local system manual/help output for systemctl, pgrep, grep, diff, curl, and dpkg-query.

## Issues Found
- The first `pgrep` example used `failed_when: false` and started nginx for any non-zero return code. `pgrep` uses return code 1 for no matches, but 2 and 3 indicate errors. Updated the task to allow only return codes 0 and 1, and to start nginx only when `rc == 1`.
- The explanatory paragraph after the first example specifically mentioned `failed_when: false`, while the corrected example uses a custom `failed_when` expression. Updated the wording to describe `failed_when` generally.
- The `pg_isready` comment omitted return code 3, which means no connection attempt was made. Added that code and softened the failure message for return code 1 because PostgreSQL can reject connections during startup as well as for configuration reasons.
- The loop example used `ansible.builtin.command` with a shell pipeline (`ss ... | grep ...`). The Ansible command module does not process shell metacharacters such as pipes. Changed that task to `ansible.builtin.shell`.

## Review Notes
The remaining examples are technically sound for illustrating return-code handling. Some examples use command-line checks where purpose-built Ansible modules may be preferable in production playbooks, but that is acceptable for a focused tutorial about command return codes.

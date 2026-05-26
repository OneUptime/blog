# Validation Summary: How to Handle Command Return Codes in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `command`, `shell`, `systemd`, `debug`, `assert`, and `set_fact` modules
- Ansible task result handling with `failed_when`, `changed_when`, `ignore_errors`, `block`, `rescue`, `always`, `retries`, and `until`
- Common Unix/Linux command return codes for `grep`, `diff`, `wget`, `curl`, `rsync`, `dpkg-query`, and `pg_isready`

## Sources Consulted
- Ansible Community Documentation: Error handling in playbooks, https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible Community Documentation: Blocks, https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible Community Documentation: `ansible.builtin.command`, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community Documentation: Common return values, https://docs.ansible.com/ansible/latest/reference_appendices/common_return_values.html
- GNU Grep Manual: Exit Status, https://www.gnu.org/software/grep/manual/html_node/Exit-Status.html
- GNU Diffutils Manual, https://www.gnu.org/software/diffutils/manual/diffutils.html
- GNU Wget Manual: Exit Status, https://www.gnu.org/software/wget/manual/html_node/Exit-Status.html
- curl Manual: Exit Codes, https://curl.se/docs/manpage.html#EXIT-CODES
- rsync man page: Exit values, https://man7.org/linux/man-pages/man1/rsync.1.html
- Debian `dpkg-query` man page: Exit status, https://manpages.debian.org/bookworm/dpkg/dpkg-query.1.en.html
- PostgreSQL Documentation: `pg_isready`, https://www.postgresql.org/docs/current/app-pg-isready.html

## Issues Found
- The block/rescue/always example used `ansible_failed_task` in the `always` section to decide whether the deployment succeeded. Ansible documents `ansible_failed_task` and `ansible_failed_result` for tasks in the `rescue` portion of a block, so the example now sets `deployment_failed: true` in `rescue` and checks that fact in `always`.
- The package-check example described `apt-get` return codes while running `dpkg -s`. I changed the comment and command to `dpkg-query -s`, and changed `failed_when: false` to `failed_when: pkg_check.rc not in [0, 1]` so package-not-found remains expected while fatal `dpkg-query` errors still fail.

## Review Notes
- The Ansible examples use current documented task keywords and module names. `yes` is valid YAML, though `true` is often preferred in newer examples for readability.
- Several read-only `command` examples intentionally focus on failure handling and would still report `changed` unless `changed_when: false` is added; the post later explains this behavior.

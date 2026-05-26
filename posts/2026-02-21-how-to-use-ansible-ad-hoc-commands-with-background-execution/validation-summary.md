# Validation Summary: How to Use Ansible Ad Hoc Commands with Background Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible asynchronous execution (`-B` / `--background`, `-P` / `--poll`)
- `ansible.builtin.async_status`
- `ansible.builtin.apt`
- `ansible.builtin.shell`
- Bash monitoring script

## Sources Consulted
- Ansible Community Documentation: Asynchronous actions and polling - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible Community Documentation: `ansible` CLI options - https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible Community Documentation: `ansible.builtin.async_status` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible Community Documentation: `ansible.builtin.apt` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Core Documentation: `ansible.builtin.shell` module - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible Community Documentation: `ansible.builtin.copy` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Community Documentation: `ansible.builtin.template` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible Community Documentation: `ansible.builtin.sh` shell plugin async directory - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sh_shell.html

## Issues Found
- Updated example `started` and `finished` values from `1`/`0` to `true`/`false`. Ansible documents these return values as booleans in current releases, with ansible-core 2.19 changing them from integer-style values.
- Replaced hard-coded `/root/.ansible_async/...` sample paths with `~/.ansible_async/...` because Ansible documents the async directory as configurable and defaulting to `~/.ansible_async`.
- Corrected status-check examples to target the host that owns the returned job ID instead of implying that a single per-host job ID can be checked across all hosts.
- Corrected the `-P 60` explanation. Polling keeps the Ansible process running and, in most cases, keeps remote connections open between polls; it does not free the terminal like `-P 0`.
- Changed the database backup example from `pg_dump --format=custom ... | gzip > .sql.gz` to plain `pg_dump ... | gzip > .sql.gz`, matching the filename and shell pipeline.
- Updated the monitoring script to detect both current boolean `finished` values and older integer-style values.
- Replaced direct deletion of async result files with `async_status mode=cleanup`, which is the documented cleanup mechanism for async job cache files.

## Review Notes
- The ad hoc `ansible`, `async_status`, `apt`, and `shell` examples use valid current options according to the official documentation.
- The post correctly notes that `copy` and `template` do not support async execution; their module attributes list async support as none.
- The local environment did not have Ansible installed, so validation used current upstream Ansible documentation rather than local `ansible --help` output.

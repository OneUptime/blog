# Validation Summary: How to Use Ansible Async Status Module to Check Background Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible asynchronous playbook tasks
- `ansible.builtin.async_status`
- Ansible built-in modules including `command`, `apt`, `package`, `hostname`, `lineinfile`, `template`, `uri`, `fail`, `copy`, and `cron`
- `community.general.timezone`
- `community.general.ufw`
- PostgreSQL `pg_dump`

## Sources Consulted
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_async.html
- `ansible.builtin.async_status` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/command_module.html
- `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/17/app-pgdump.html

## Issues Found
- The `pg_dump` examples used shell redirection (`>`) with `ansible.builtin.command`. The Ansible command module does not process shell metacharacters such as redirection, so the tasks would not write the dump files as intended. Changed the examples to use PostgreSQL's `pg_dump -f` output-file option, which works with `ansible.builtin.command`.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the module name to the current documented FQCN.
- Two example comments claimed the snippets incorporated or used `async_status` even though those particular snippets did not. Reworded the comments to avoid an inaccurate technical claim.

## Review Notes
- The core `async`, `poll: 0`, `async_status`, `mode: cleanup`, and `async` with positive `poll` examples align with Ansible's official asynchronous task documentation.
- `async_status` return values `started` and `finished` are booleans in ansible-core 2.19 and newer; older versions returned `1` or `0`. The post's `until: job_result.finished` style still works as a truthy/falsy condition, but the official examples now commonly use the `is finished` test.

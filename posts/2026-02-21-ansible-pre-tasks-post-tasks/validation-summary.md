# Validation Summary: How to Use Ansible Pre-Tasks and Post-Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible pre_tasks and post_tasks
- Ansible handlers
- Ansible roles
- Ansible modules: uri, service, copy, template, git, file, unarchive, command, debug, assert
- Ansible collections: ansible.posix, community.general
- HAProxy backend management

## Sources Consulted
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible roles execution order documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible playbook execution documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html
- Ansible gather_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/gather_facts_module.html
- Ansible loop and retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- ansible.posix.synchronize module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html
- community.general.haproxy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/haproxy_module.html
- community.general.archive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- ansible.builtin.unarchive module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/unarchive_module.html

## Issues Found
- The examples used short module names for modules that are provided by external collections in current Ansible documentation. Changed `synchronize` to `ansible.posix.synchronize`, `haproxy` to `community.general.haproxy`, and `archive` to `community.general.archive` so the examples match the documented current module names.
- The HAProxy rolling deployment example described a connection drain but implemented it as a fixed `wait_for` timeout. Changed the HAProxy disable task to use the module's documented `wait`, `drain`, `wait_interval`, and `wait_retries` options so it waits for active connections to drain before continuing.

## Review Notes
- The post's execution-order explanation is accurate: handlers are automatically flushed after `pre_tasks`, after the combined `roles`/`tasks` phase, and after `post_tasks`.
- The `retries` examples without `until` rely on current Ansible behavior introduced in ansible-core 2.16, where a task retries until success up to the retry limit when `until` is omitted.
- The local environment did not have the `ansible` CLI installed, so syntax validation was performed by documentation review and manual YAML inspection rather than by running `ansible-playbook --syntax-check`.

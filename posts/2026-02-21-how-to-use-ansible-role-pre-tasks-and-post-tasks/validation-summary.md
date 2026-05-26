# Validation Summary: How to Use Ansible Role Pre-Tasks and Post-Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- Ansible pre_tasks and post_tasks
- Ansible handlers
- Ansible built-in modules: apt, yum, assert, slurp, set_fact, debug, copy, file, uri, wait_for, command, pause
- Ansible collections: community.general.haproxy, community.hashi_vault
- HashiCorp Vault lookup usage

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible loops and retry/until documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- community.general.haproxy module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/haproxy_module.html
- community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html

## Issues Found
- The execution-order diagram and key points implied that each section flushes its own handlers. Official Ansible documentation says handlers are automatically run after `pre_tasks`, after the combined `roles`/`tasks` phase, and after `post_tasks`. Updated the diagram label from "Flush tasks handlers" to "Flush roles and tasks handlers" and clarified the key point.
- The role execution summary said all roles run in the listed order. This is broadly true for listed roles, but official documentation notes that role dependencies run before the role that depends on them. Updated the wording to include that caveat.

## Review Notes
- The module examples use current fully qualified collection names and valid module parameters.
- The examples that use `retries` without `until` rely on current ansible-core behavior where a task can retry until it succeeds, up to the configured retry count. Adding explicit `until` conditions would improve compatibility with older Ansible versions, but the examples are valid for current Ansible.

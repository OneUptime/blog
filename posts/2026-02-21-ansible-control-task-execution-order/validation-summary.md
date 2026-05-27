# Validation Summary: How to Control Task Execution Order in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible roles and role dependencies
- Ansible handlers and `meta: flush_handlers`
- Ansible blocks, `rescue`, and `always`
- `import_tasks` and `include_tasks`
- Ansible host ordering with `order`
- `community.general.haproxy`

## Sources Consulted
- Ansible Roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Blocks documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible Strategies and host ordering documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- `ansible.builtin.include_tasks` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- `ansible.builtin.import_tasks` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_tasks_module.html
- `ansible.builtin.gather_facts` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/gather_facts_module.html
- Ansible Playbook Keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- `community.general.haproxy` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/haproxy_module.html

## Issues Found
- The play execution order omitted the default fact-gathering step. I added a note that Ansible gathers facts before the listed sections unless `gather_facts: false` is set, and added `gather_facts: false` to the demonstration playbook so its shown output matches the example.
- The handler ordering text implied handlers always run. I clarified that the listed handler order applies if all three handlers are notified.
- The `order: inventory` option was described as inventory order without caveat. I clarified that it uses Ansible's inventory selection order, which is reproducible but not guaranteed to match the source file order.

## Review Notes
The post is technically relevant and the remaining examples align with current Ansible documentation. The `community.general.haproxy` example assumes the `community.general` collection is installed and HAProxy is configured with an admin socket, which is normal for this module but may be worth calling out in a future expansion.

# Validation Summary: How to Access Variables from Other Hosts in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible magic variables: `hostvars` and `groups`
- Ansible facts and fact caching
- Ansible delegation with `delegate_to`
- Ansible filters, including `extract`
- Ansible modules: `set_fact`, `template`, `copy`, `uri`, and `community.general.haproxy`

## Sources Consulted
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible delegation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- `ansible.builtin.extract` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/extract_filter.html
- Ansible cache plugins documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/cache.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/set_fact_module.html
- `community.general.haproxy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/haproxy_module.html

## Issues Found
- The database replica example used `default('')` after indexing `groups['databases'][1]`. That would not reliably protect the expression when the inventory has only one database host, because the missing list item is referenced before the default value is useful. Updated it to check the group length before accessing the second host.
- The delegation section implied that `ansible_host` still referred to the original host during delegated tasks. Official Ansible documentation notes that connection variables such as `ansible_host` can reflect the delegated host. Updated the explanation and changed the example to use `hostvars[inventory_hostname]['ansible_host'] | default(inventory_hostname)` for the original web server address.
- The HAProxy example used the short `haproxy` module name. Current documentation identifies this as `community.general.haproxy` and notes it is not included in `ansible-core`. Updated the example to use the fully qualified collection name.

## Review Notes
The post's guidance on `hostvars`, gathered facts, cached facts, `extract`, `run_once`, and `set_fact` is consistent with current Ansible documentation. Many examples use top-level injected fact names such as `ansible_default_ipv4`; these are valid with Ansible's default fact injection behavior, though using the `ansible_facts` namespace can be more explicit in future updates.

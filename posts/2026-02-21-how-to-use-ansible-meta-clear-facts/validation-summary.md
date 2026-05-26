# Validation Summary: How to Use Ansible meta clear_facts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.meta` with `clear_facts`
- `ansible.builtin.setup` fact gathering
- `ansible.builtin.set_fact`
- Ansible fact caching
- Ansible fact subsets

## Sources Consulted
- Ansible Core documentation for `ansible.builtin.meta`: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/meta_module.html
- Ansible documentation for `ansible.builtin.set_fact`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible Core documentation for `ansible.builtin.setup`: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible documentation for facts and magic variables: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation for cache plugins: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html

## Issues Found
- The post said `meta: clear_facts` wipes facts for the current host. Official Ansible documentation describes `clear_facts` as clearing gathered facts for the hosts targeted by the play, including the fact cache. Updated the wording to match that behavior.
- The post implied `clear_facts` removes a cacheable `set_fact` variable entirely. Official documentation states that cacheable `set_fact` creates both a high-precedence host variable and a lower-precedence `ansible_facts` copy; `clear_facts` removes the `ansible_facts` copy but not the current-run host variable. Updated the explanation and demonstration output accordingly.
- The examples used top-level injected fact variables such as `ansible_kernel` and `ansible_distribution`. These still work by default, but ansible-core 2.19 emits deprecation warnings for relying on injected top-level fact variables. Updated examples to use `ansible_facts` access such as `ansible_facts.kernel`, `ansible_facts.distribution`, and `ansible_facts.mounts`.

## Review Notes
The examples are illustrative and assume appropriate target platforms, inventory, privileges, variables, templates, and installed collections such as `community.general` and `ansible.posix`. The local environment did not have Ansible installed initially, so ansible-core 2.19.1 was installed into `/tmp` for spot verification of `clear_facts` and cacheable `set_fact` behavior.

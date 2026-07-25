# Validation Summary: Speeding Up Ansible Fact Gathering with Subsets and Fact Caching

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Ansible and ansible-core
- Ansible facts and the `ansible.builtin.setup` module
- Fact subsets and fact filtering
- Fact cache plugins, including `ansible.builtin.memory` and `ansible.builtin.jsonfile`
- Ansible configuration, playbook YAML, Jinja templating, and command-line tools
- Custom facts from `facts.d`

## Sources Consulted

- [Discovering variables: facts and magic variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html)
- [ansible.builtin.setup module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html)
- [Cache plugins](https://docs.ansible.com/projects/ansible/latest/plugins/cache.html)
- [ansible.builtin.jsonfile cache plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/jsonfile_cache.html)
- [Ansible configuration settings](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html)
- [Playbook keywords](https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html)
- [ansible.builtin.meta module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html)
- [ansible.builtin.set_fact module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html)
- [ansible-config CLI documentation](https://docs.ansible.com/projects/ansible/latest/cli/ansible-config.html)
- [ansible-doc CLI documentation](https://docs.ansible.com/projects/ansible/latest/cli/ansible-doc.html)
- [Ansible 13 porting guide](https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_13.html)
- [The `now()` function](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html)

## Issues Found

- The filtered `setup` example excluded both `all` and `min` without selecting any fact subset, so the requested distribution facts would not be collected. Added the `distribution`, `distribution_major_version`, and `os_family` subsets.
- The explanation could imply that `filter` reduces collection work. Clarified that `filter` limits returned first-level facts, while `gather_subset` controls which facts are collected.
- The `clear_facts` description mentioned only persistent facts. Clarified that it clears gathered facts for the play's hosts, including the persistent fact cache, while retaining the documented warning about the separate high-precedence host variable created by cacheable `set_fact`.
- The custom-facts description implied that static `.fact` files execute. Clarified that static files are read and executable `.fact` scripts run on the managed node; both populate `ansible_local`.

## Review Notes

Reviewed against the current Ansible 13 and ansible-core 2.20 documentation. The article correctly notes the pending change to `INJECT_FACTS_AS_VARS`; its current default is deprecated and is scheduled to switch to `false` in ansible-core 2.24. Named fact subsets remain version-sensitive, so the article's recommendation to check the installed release's `setup` documentation is appropriate.

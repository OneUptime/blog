# Validation Summary: How to Merge List Variables from Multiple Sources in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible variable precedence
- Ansible role defaults, group_vars, and extra vars
- Jinja2 list concatenation and filters
- ansible.builtin.union filter
- community.general.lists_mergeby filter
- ansible.builtin.combine filter
- ansible.builtin.varnames and ansible.builtin.vars lookups
- ansible.builtin.apt and ansible.builtin.iptables modules
- Ansible hash_behaviour configuration

## Sources Consulted
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html#understanding-variable-precedence
- ansible.builtin.union filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/union_filter.html
- community.general list set filter guide: https://docs.ansible.com/ansible/latest/collections/community/general/docsite/filter_guide_abstract_informations_lists_helper.html
- community.general.lists_mergeby filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/lists_mergeby_filter.html
- ansible.builtin.combine filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible configuration settings for DEFAULT_HASH_BEHAVIOUR: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-hash-behaviour
- ansible.builtin.varnames lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/varnames_lookup.html
- ansible.builtin.vars lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/vars_lookup.html
- ansible.builtin.iptables module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/iptables_module.html

## Issues Found
- The `union` example implied a stable output order. Current ansible-core documentation says `union` returns items in arbitrary order. I changed the comment to "Example result" and added a note recommending concatenation plus `unique`, or `community.general.lists_union`, when order matters.
- The `community.general.lists_mergeby` explanation described the operation as simple deduplication with last occurrence winning. The filter merges dictionaries by a key, with later values replacing earlier values by default for overlapping fields. I updated the task wording and clarified that the manual Jinja2 fallback is only equivalent when last-definition-wins behavior is enough.
- The `hash_behaviour = merge` section said the setting has already been deprecated in recent versions. Current Ansible documentation says it is not recommended for new projects and is intended to eventually be deprecated and removed. I corrected the wording and the configuration comment.
- The `iptables` examples used `action: allow` and passed `ALLOW` to the module's `jump` parameter. `jump` expects an iptables target such as `ACCEPT`, not `ALLOW`. I changed the sample data to use `jump: ACCEPT` and passed that value directly.
- The dynamic `varnames` example used `lookup()` plus comma splitting. Official examples favor `query()` for list-returning lookup behavior, and `varnames` terms are Python regex patterns. I changed the example to use `query('ansible.builtin.varnames', '^firewall_rules_.+')` and loop over the returned list.

## Review Notes
The remaining examples and explanations align with Ansible's documented variable precedence, list concatenation behavior, dictionary merging via `combine`, and the documented behavior of the referenced filters and lookups. The examples were reviewed against official documentation, but Ansible is not installed in this workspace, so I could not execute the playbooks locally.

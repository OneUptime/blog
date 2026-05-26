# Validation Summary: How to Migrate from with_together to loop in Ansible

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Ansible playbooks
- Ansible `loop`
- Ansible `with_together` / `together` lookup
- Ansible `zip` and `zip_longest` filters
- YAML task snippets

## Sources Consulted
- Ansible loop documentation, including "Migrating from with_X to loop" and the `with_together` migration example: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.zip` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/zip_filter.html
- Ansible `ansible.builtin.zip_longest` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/zip_longest_filter.html
- Ansible `ansible.builtin.together` lookup documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/together_lookup.html

## Issues Found
- The unequal-list `zip_longest` example said it matched `with_together` behavior, but it used `fillvalue=''`, which pads with an empty string instead of the `None` value used by `with_together`. Changed the example to omit `fillvalue`, which uses the default `None` padding behavior.
- The example used `default('N/A')` to handle missing values. In Jinja/Ansible, `default()` without the boolean argument only replaces undefined values, not defined falsey values such as `None`. Changed it to `default('N/A', true)` so padded `None` values render as `N/A`.
- The Mermaid migration visualization showed `zip_longest(list_b, fillvalue='')` for the "pad with None" path. Updated it to `zip_longest(list_b) | list` to match the documented `with_together` behavior.

## Review Notes
The main migration guidance is consistent with Ansible's official documentation: `with_together` can be migrated to `loop` with the `zip` filter for equal-length lists, while `zip_longest` is needed when preserving the old padding behavior for unequal-length lists. Ansible documentation notes that `with_<lookup>` syntax is not deprecated, though `loop` is recommended for most use cases.

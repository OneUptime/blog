# Validation Summary: How to Migrate from with_dict to loop in Ansible

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible playbooks
- Ansible loop syntax
- `with_dict`
- `dict2items` filter
- `loop_control`
- Ansible module examples: `ansible.builtin.user`, `ansible.posix.sysctl`, `ansible.builtin.lineinfile`, `community.postgresql.postgresql_db`, `ansible.builtin.template`, `ansible.builtin.command`, `ansible.builtin.debug`

## Sources Consulted
- Ansible Core loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible latest `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible 2.9 filter documentation showing `dict2items` version history: https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_filters.html
- Ansible `dict` lookup documentation for `with_dict`/dictionary item shape: https://docs.ansible.com/projects/ansible/2.9/plugins/lookup/dict.html
- GNU `grep --help` output on the local system for `grep -rn --include` usage

## Issues Found
- The post described `with_dict` as legacy/deprecated-style syntax and implied it was only historical. Updated the wording to clarify that `with_<lookup>` syntax remains valid while `loop` is recommended for most use cases.
- The post said the recommended `loop` plus `dict2items` approach existed since Ansible 2.5. Updated this because `loop` was introduced in Ansible 2.5, while `dict2items` is documented as new in Ansible 2.6.
- The post claimed `loop` does not support inline dictionaries the way `with_dict` did and that inline dictionaries must be moved to variables. Updated this to explain that inline dictionary expressions can be used with `loop`, while task-level `vars` is often cleaner.
- The post said filtering dictionary entries before looping was not possible with `with_dict`. Updated this to the narrower claim that direct filter chaining is less direct with `with_dict`, which matches Ansible's lookup-based model without overstating the limitation.

## Review Notes
The examples using `loop: "{{ variable | dict2items }}"`, `item.key`, `item.value`, `loop_control.label`, registered loop results, and `ansible-playbook site.yml --check --diff` are consistent with the consulted documentation. Ansible was not installed locally, so playbook execution was not run; validation relied on official Ansible documentation and local verification of the generic `grep` command flags.

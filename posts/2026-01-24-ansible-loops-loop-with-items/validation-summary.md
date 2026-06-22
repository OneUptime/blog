# Validation Summary: How to Handle Ansible Loops with loop and with_items

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbook loops
- Ansible `loop` and legacy `with_*` syntax
- Ansible `loop_control`
- Jinja2 filters used by Ansible (`dict2items`, `subelements`, `product`, `selectattr`, `flatten`)
- Ansible modules including `apt`, `package`, `user`, `template`, `file`, `uri`, and `authorized_key`

## Sources Consulted
- Ansible Community Documentation: Loops - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible 2.5 Porting Guide: Migrating from with_X to loop - https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_2.5.html
- Ansible Lookup Plugins: query and wantlist behavior - https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- ansible.builtin.apt module documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.fileglob lookup documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- ansible.builtin.lines lookup documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lines_lookup.html

## Issues Found
- The post described `loop` as a replacement for all `with_*` constructs. Updated the wording to say it is a cleaner replacement for many `with_*` constructs and is recommended in most cases, matching Ansible's guidance that some lookup-based `with_*` statements may be cleaner to keep.
- The `with_items` migration table showed a plain `loop` replacement. Updated it to include `flatten(1)` because Ansible documents that `with_items` performs implicit single-level flattening.
- Added a short note after the `with_items` example explaining when `flatten(1)` is needed during migration.
- The `index_var` example displayed a zero-based loop index as a one-based progress count. Updated the message to use `loop_index + 1` and added a comment that `index_var` is zero-based.
- The `with_lines` migration table used `lookup('lines', ...)` with `loop`. Updated it to `query('lines', ...)` so the loop receives list input consistently, as recommended by Ansible's lookup documentation.

## Review Notes
The remaining examples are technically consistent with the official Ansible loop documentation. The post uses short module names such as `apt`, `user`, and `template`; Ansible documentation now often recommends Fully Qualified Collection Names for linkability and conflict avoidance, but short names remain valid for these examples.

# Validation Summary: How to Migrate from with_items to loop in Ansible

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Ansible playbook loops
- `with_items`
- `loop`
- Ansible filters, including `flatten` and `list`
- Ansible package modules, including `ansible.builtin.apt`
- `ansible-playbook` check mode

## Sources Consulted
- Ansible Community Documentation: Loops - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible Community Documentation: `ansible.builtin.flatten` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/flatten_filter.html
- Ansible Community Documentation: `ansible.builtin.apt` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html

## Issues Found
- The post described `with_items` as deprecated. Current Ansible documentation says `loop` was added in Ansible 2.5 and is recommended for most use cases, but also explicitly says `with_<lookup>` syntax has not been deprecated. I changed the wording to call `with_items` older syntax rather than deprecated.
- The flattening migration example used list concatenation followed by recursive `flatten`. To match `with_items` single-level flattening exactly, I changed it to build a list of list variables and apply `flatten(levels=1)`.
- The text described registered variable structures as slightly different between `with_items` and `loop`. For this migration, the important behavior is the same: per-item results are stored under `.results`. I adjusted the wording accordingly.
- The common mistake example used `(list_a + list_b) | flatten`, which is not the closest equivalent to the shown list-of-lists mistake and can over-flatten nested data. I changed it to `[list_a, list_b] | flatten(levels=1)`.
- The summary said every non-flattening case is a simple find-and-replace. I narrowed that wording to simple lists, because exact `with_items` migrations may still need `flatten(levels=1)`.

## Review Notes
Ansible was not installed in the local environment, so CLI syntax could not be verified with local `ansible-playbook --help`. The `ansible-playbook site.yml --check --diff` command matches documented Ansible usage, and the rest of the review was validated against official Ansible documentation.

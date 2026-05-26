# Validation Summary: How to Use the product Filter for Cartesian Products in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible filter plugins
- Jinja templating in Ansible playbooks
- YAML
- JSON formatting in Ansible

## Sources Consulted
- Ansible `ansible.builtin.product` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/product_filter.html
- Ansible `ansible.builtin.combinations` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/combinations_filter.html
- Ansible `ansible.builtin.permutations` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/permutations_filter.html
- Ansible `ansible.builtin.from_yaml` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/from_yaml_filter.html
- Ansible `ansible.builtin.to_json` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/to_json_filter.html
- Ansible `ansible.builtin.to_nice_json` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/to_nice_json_filter.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.rejectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/rejectattr_filter.html

## Issues Found
- The `set_fact` examples for `test_matrix`, `firewall_rules`, and `all_combos` used a folded Jinja block that appended objects to a temporary list and rendered `{{ result }}`. In Ansible, those examples produced strings rather than structured lists, so later operations such as `test_matrix | length`, `loop: "{{ firewall_rules }}"`, and `selectattr`/`rejectattr` on `all_combos` would not work as intended. Updated those examples to generate YAML list content in a task-local variable and parse it with `from_yaml`, producing actual list-of-dictionary values.

## Review Notes
- The core explanation of `product` as a Cartesian product is correct. The official Ansible documentation describes `product` as a passthrough to Python's `itertools.product` and supports additional positional lists.
- The comparison with `combinations(2)` and `permutations(2)` is technically accurate: combinations are unordered selections of a set size, while permutations are ordered arrangements.
- The examples were validated with a temporary `ansible-core` installation because Ansible was not installed in the base environment.

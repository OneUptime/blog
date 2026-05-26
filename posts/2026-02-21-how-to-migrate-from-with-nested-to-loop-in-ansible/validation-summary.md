# Validation Summary: How to Migrate from with_nested to loop in Ansible

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Ansible playbook loops
- Ansible `with_nested` / `with_cartesian`
- Ansible `loop`
- Ansible `ansible.builtin.product` filter
- Ansible `ansible.builtin.subelements` filter
- Jinja2 filter expressions in Ansible

## Sources Consulted
- Ansible Community Documentation: Loops and migrating from `with_X` to `loop` - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible Community Documentation: `ansible.builtin.product` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/product_filter.html
- Ansible Community Documentation: `ansible.builtin.subelements` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible Community Documentation: Using filters to manipulate data - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html

## Issues Found
No technical issues found.

## Review Notes
The post accurately follows Ansible's documented migration from `with_nested`/`with_cartesian` to `loop` with the `product` filter and `| list`. The examples use valid tuple/list access patterns (`item.0`, `item.1`, and bracket notation), and the registered variable and `loop_control.label` examples match Ansible's documented loop behavior. Ansible documentation notes that `with_<lookup>` syntax has not been deprecated and remains valid, but `loop` is recommended for most loop use cases.

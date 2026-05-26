# Validation Summary: How to Use Ansible loop with index_var for Indexed Loops

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible loop and loop_control
- ansible.builtin.debug
- ansible.builtin.template
- ansible.builtin.blockinfile
- ansible.builtin.lineinfile
- ansible.builtin.command
- ansible.builtin.cron
- ansible.builtin.file
- ansible.builtin.systemd
- ansible.builtin.service
- Jinja2 expressions in Ansible

## Sources Consulted
- Ansible loop documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible latest loop documentation: https://docs.ansible.com/projects/ansible/8/playbook_guide/playbooks_loops.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.blockinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/blockinfile_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.systemd module documentation: https://docs.ansible.com/projects/ansible/7/collections/ansible/builtin/systemd_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The first conditional deployment task was labeled "even indices", but `when: server_idx < 3` selects the first half of the list, not even-numbered positions. Changed the task name to "first half" to match the condition and surrounding explanation.
- The DNS resolver example used `lineinfile` with the same `insertafter` anchor for every loop item. Repeated insertions after the same anchor can reverse the resulting order, which conflicted with the "priority-ordered" explanation. Changed the task to use `blockinfile` with a unique marker based on `dns_priority` and an insertion regex that places each block after the previous priority marker.
- The HAProxy examples inserted every generated server line after the same backend header. That can also reverse the visible order of loop-generated lines. Updated `insertafter` to target the previous indexed server line first, falling back to the backend header for index 0.

## Review Notes
The core claim is correct: official Ansible documentation states that `loop_control.index_var` stores the current loop index and that it is zero-indexed. The post uses current FQCN-style Ansible module names. `ansible-playbook` was not installed in the local environment, so syntax validation was performed by inspection against official documentation rather than by running a local syntax check.

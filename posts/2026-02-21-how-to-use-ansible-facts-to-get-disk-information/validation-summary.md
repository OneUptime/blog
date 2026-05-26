# Validation Summary: How to Use Ansible Facts to Get Disk Information

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible facts
- Ansible playbooks
- Jinja2 templating and filters
- Linux block devices, mounted filesystems, and LVM facts

## Sources Consulted
- Ansible documentation: Discovering variables, facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible Core documentation: ansible.builtin.setup module - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html
- Ansible Community documentation: community.general.json_query filter - https://docs.ansible.com/projects/ansible/latest/collections/community/general/json_query_filter.html
- JMESPath specification - https://jmespath.org/specification.html

## Issues Found
- The high disk usage alert example used `json_query` with arithmetic inside a JMESPath expression. The documented Ansible `community.general.json_query` filter uses JMESPath, whose standard grammar supports comparisons and functions but not arithmetic operators such as subtraction, division, or multiplication. I removed the unused `json_query` calculation and kept the working Ansible `when` expression that calculates usage with Jinja2.
- The SSD/HDD detection example stripped trailing digits from a root device path, which turns NVMe partition names such as `/dev/nvme0n1p1` into `nvme0n1p` instead of the parent disk `nvme0n1`. I changed the device-name cleanup to remove an optional partition `p` before the trailing partition number and to safely default to HDD when the parent device is not found.

## Review Notes
- The core fact names and fields shown in the post match Ansible's documented setup output examples for `ansible_facts['devices']` and `ansible_facts['mounts']`.
- Ansible is not installed in this workspace, so I could not run `ansible-playbook --syntax-check`; validation was performed by static review against official documentation.

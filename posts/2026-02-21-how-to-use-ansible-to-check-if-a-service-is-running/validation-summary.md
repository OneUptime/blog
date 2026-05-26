# Validation Summary: How to Use Ansible to Check if a Service is Running

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible built-in modules: service_facts, command, stat, wait_for, uri, assert, set_fact, service
- systemd/systemctl
- Linux service management
- HTTP health checks
- Slack webhook notifications

## Sources Consulted
- Ansible ansible.builtin.service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.stat module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- systemctl manual page: https://www.freedesktop.org/software/systemd/man/systemctl.html

## Issues Found
No technical issues found.

## Review Notes
The examples use valid Ansible module names, options, conditionals, and return-value checks. The cross-platform service check depends on the underlying service provider's check mode support, which is consistent with the Ansible service module documentation. The `service_facts` examples correctly use bracket notation for service names, avoiding the documented dot-notation issue with service names containing hyphens.

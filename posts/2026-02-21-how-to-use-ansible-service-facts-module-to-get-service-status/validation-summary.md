# Validation Summary: How to Use Ansible service_facts Module to Get Service Status

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.service_facts
- ansible.builtin.service
- YAML playbooks
- Jinja2 templates
- Linux service managers, including systemd, SysVinit, Upstart, OpenRC, OpenBSD rcctl, and AIX SRC

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.service_facts module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible Community Documentation: ansible.builtin.service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The service fact field descriptions listed `inactive` as a current-state value and omitted `failed`, while the official Ansible documentation says service state commonly includes `failed`, `running`, `stopped`, or `unknown`, with init-system-specific additional states possible. Updated the description to match the documented common values.
- The service fact `status` description listed `masked` but omitted `indirect` and `unknown`. Updated the description to match the documented Ansible return values: `enabled`, `disabled`, `static`, `indirect`, or `unknown`.
- The service fact `source` description omitted documented sources such as `rcctl` and `src`. Updated the description to include the documented examples.

## Review Notes
The playbook examples use bracket notation for `ansible_facts['services']`, which aligns with Ansible's recommendation because service names can contain hyphens. The examples assume default Ansible fact gathering remains enabled where `ansible_date_time` is used in the report template.

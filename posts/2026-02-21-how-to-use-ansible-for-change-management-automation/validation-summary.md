# Validation Summary: How to Use Ansible for Change Management Automation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: uri, assert, copy, include_role, include_tasks, command, service, file, lineinfile, set_fact, fail
- Ansible blocks, rescue, always, retries, delegation, facts, and special variables
- ITIL-style change management workflows
- ServiceNow Table API for change requests
- Mermaid diagrams

## Sources Consulted
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible blocks, rescue, and always documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible retries documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible mandatory filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/mandatory_filter.html
- Ansible delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- ServiceNow Change Management API documentation: https://www.servicenow.com/docs/r/api-reference/rest-apis/change-management-api.html
- ServiceNow Table API documentation: https://www.servicenow.com/docs/r/api-reference/rest-apis/c_TableAPI.html

## Issues Found
- The ITSM and ServiceNow API calls were delegated to localhost inside plays that set `become: yes`. Because delegated tasks use the delegated host execution context, these controller-side API calls can unintentionally attempt privilege escalation on the control node. Added `become: false` to delegated API tasks.
- The audit role comment said it wrote to a central audit file, but the task writes to `/var/log/ansible-changes/audit.log` on each managed host. Changed the comment to say local audit file.
- The summary claimed every step logs to the ITSM platform, while the examples log selected lifecycle events. Changed the wording to "Key steps log" to match the implementation.

## Review Notes
Ansible is not installed in this workspace, so I could not run `ansible-playbook --syntax-check`. The YAML examples were reviewed manually against current official Ansible documentation. The ServiceNow example uses the generic Table API endpoint for `change_request`, which is valid, though real ServiceNow instances may require instance-specific mandatory fields, ACLs, change models, or workflow configuration.

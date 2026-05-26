# Validation Summary: How to Fix Ansible become_method requires become Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible privilege escalation (`become`, `become_method`, `become_user`)
- Ansible configuration (`ansible.cfg`)
- Ansible playbooks and task-level directives
- Ansible built-in modules: `setup`, `debug`, `package`, `hostname`, `lineinfile`, `service`, `template`, `uri`, `command`, `fail`, `copy`, `cron`
- Ansible community modules: `community.general.timezone`, `community.general.ufw`
- Linux privilege escalation methods: `sudo`, `su`, `doas`, `pbrun`

## Sources Consulted
- Ansible privilege escalation guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible configuration settings: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible playbook keywords: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- `ansible.builtin.setup` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/setup_module.html
- `ansible.builtin.package` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- `community.general.timezone` documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- `community.general.ufw` documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- `ansible.builtin.uri` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.cron` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The post described `become_method` as if it were part of a module-based workflow. Updated this wording to describe privilege escalation instead, matching Ansible's documented terminology.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the task to use `community.general.timezone`.
- The opening explanation implied that `become_method` itself enables escalation. Updated the explanation to state that `become_method` selects the escalation method, while `become` enables escalation.

## Review Notes
The examples are generally valid Ansible snippets. Some infrastructure tasks are environment-dependent, such as service names and package availability across distributions, but they are plausible examples rather than version-specific guarantees.

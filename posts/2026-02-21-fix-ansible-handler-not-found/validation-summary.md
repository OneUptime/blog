# Validation Summary: How to Fix Ansible Handler not found Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible handlers, notify, and listen
- Ansible roles
- Ansible built-in modules
- community.general Ansible collection modules
- YAML

## Sources Consulted
- Ansible Community Documentation: Handlers: running operations on change - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Community Documentation: community.general.timezone module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible Community Documentation: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible Community Documentation: ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: ansible.builtin.cron module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible Core Documentation: ansible.builtin.systemd module redirect - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/systemd_module.html

## Issues Found
- The post claimed that handlers defined in one role are not visible to other roles. Current Ansible documentation says handlers from roles are inserted into the play's global handler scope and can be used outside the role after they are loaded. Updated the section to explain handler availability for roles that have not been loaded yet, especially dynamically included roles.
- The summary said handler-not-found errors are always name matching issues and that handlers are scoped to their play or role. Updated this to include unloaded handlers and to describe play-level availability after handlers are loaded.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current documentation lists the timezone module as `community.general.timezone`. Updated the module FQCN.

## Review Notes
The examples use short names such as `template` and `systemd` in introductory snippets. These remain valid in Ansible, though FQCNs are preferable in production examples. The `ansible.builtin.systemd` module name is currently a redirect to `ansible.builtin.systemd_service`, so the examples still work.

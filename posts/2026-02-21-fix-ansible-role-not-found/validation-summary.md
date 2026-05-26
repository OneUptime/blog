# Validation Summary: How to Fix Ansible Could not find or access Role Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible roles
- Ansible Galaxy CLI
- Ansible configuration (`ansible.cfg`, `roles_path`)
- Ansible playbooks and built-in modules
- `community.general` collection modules

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Galaxy user guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The post said the minimum role requirement is `roles/rolename/tasks/main.yml`. Current Ansible documentation says a role has a standard directory structure but no single file from that list is universally required. I changed the wording to say that roles meant to run tasks through `roles:` should put those tasks in `roles/rolename/tasks/main.yml`.
- The direct role installation command used the older generic `ansible-galaxy install` form. I changed it to the current documented role-specific form, `ansible-galaxy role install geerlingguy.docker`.
- The custom role install path command used the generic `ansible-galaxy install -r requirements.yml -p ./roles` form. I changed it to `ansible-galaxy role install -r requirements.yml --roles-path ./roles`, matching the role-install CLI documentation and avoiding ambiguity with collections in the same requirements file.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the timezone module is documented as `community.general.timezone` and is not included in `ansible-core`. I changed the task to use `community.general.timezone`, which is consistent with the post's `community.general` collection requirement.
- The "Common Use Cases" section referred to "this module," but the post is about Ansible role lookup errors rather than an Ansible module. I changed those references to neutral Ansible playbook/pattern wording.

## Review Notes
The remaining examples are syntactically plausible Ansible playbook snippets. Some operational details are environment-dependent, such as the SSH service name (`sshd` versus `ssh`) and whether target systems have all listed packages available, but they are not incorrect for the Linux distributions where those names apply.

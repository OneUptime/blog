# Validation Summary: How to Fix Ansible Destination not writable Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible privilege escalation with `become` and `become_user`
- Ansible configuration with `remote_tmp`
- Ansible built-in modules: `template`, `file`, `copy`, `setup`, `package`, `hostname`, `lineinfile`, `service`, `uri`, `command`, `debug`, `fail`, and `cron`
- `community.general` Ansible modules: `timezone` and `ufw`
- Linux filesystem permissions and ownership

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.sh` shell plugin `remote_tmp` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sh_shell.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The post said the error occurs where the connecting user lacks write permissions. Updated this to the user Ansible is executing as, because privilege escalation can change the effective user for a task.
- The summary said `"Destination not writable"` is always a permissions issue. Updated this to note that it is usually a permissions or remote temporary directory issue, matching the post's own `remote_tmp` section and Ansible shell plugin documentation.
- The infrastructure example used `ansible.builtin.timezone`, which is not a current `ansible.builtin` module. Changed it to `community.general.timezone`, which is the documented current module name.
- The "Common Use Cases" text and comments referred to "this module," but the post is about troubleshooting patterns rather than a single module. Updated the wording to avoid implying a nonexistent module.

## Review Notes
Some examples are intentionally generic and may need environment-specific adjustments, such as package names, the SSH service name, existing users, UFW availability, or pre-created parent directories. The snippets are syntactically valid Ansible examples after the corrections above.

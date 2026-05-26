# Validation Summary: How to Organize Ansible Playbooks in a Project Directory

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible playbooks
- Ansible inventories
- Ansible roles
- Ansible group_vars and host_vars
- Ansible Vault
- ansible.cfg configuration
- ansible-galaxy role and collection requirements
- YAML and INI configuration snippets

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Galaxy user guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- ansible-playbook CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- ansible.builtin.ssh connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- ansible.builtin.apt module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.file module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- ansible.builtin.systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.unarchive module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html

## Issues Found
- The production `ansible.cfg` example disabled SSH host key checking. I changed `host_key_checking = False` to `host_key_checking = True` so the production-ready example keeps host key verification enabled.
- The `nginx_sites` variable referenced `myapp-site.conf.j2`, but the shown nginx role only included `nginx.conf.j2` and `site.conf.j2`. I changed the variable to reference `site.conf.j2` so the example matches the displayed role structure.
- The Galaxy install instructions ran both `ansible-galaxy install -r requirements.yml` and `ansible-galaxy collection install -r requirements.yml`, which is redundant for the same combined requirements file in current Ansible documentation. I kept the single combined install command.
- The `unarchive` example unpacked into `/opt/myapp`, but Ansible's `unarchive` module requires `dest` to already exist. I added a task to create `/opt/myapp` before extraction.

## Review Notes
- The examples use short module names such as `apt`, `file`, `template`, and `include_role`. These remain valid for built-in modules, though current Ansible documentation recommends Fully Qualified Collection Names for clearer links and conflict avoidance.
- `ansible-galaxy install -r requirements.yml` works for combined role and collection requirements in current Ansible documentation when no custom role or collection install path is being specified.

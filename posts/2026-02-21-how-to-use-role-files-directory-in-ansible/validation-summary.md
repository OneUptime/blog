# Validation Summary: How to Use Role Files Directory in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- Ansible `files/` directories
- `ansible.builtin.copy`
- `ansible.builtin.script`
- `ansible.builtin.unarchive`
- `ansible.builtin.template`
- systemd unit files
- sudoers validation with `visudo`

## Sources Consulted
- Ansible playbook guide: Search paths in Ansible: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.script` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The script example used `args.creates: /opt/myapp/.db_initialized` but the script did not create that marker file. Added `touch /opt/myapp/.db_initialized` so the example actually becomes idempotent after a successful run.
- The file lookup order section incorrectly said Ansible falls back to the playbook `files/` directory and then the current working directory, and suggested playbook files can override role files. Updated it to match Ansible's documented local relative path resolution: current role, parent roles, current task file directory, then current play file directory. Also noted that Ansible does not search the execution current working directory.

## Review Notes
The remaining examples use current fully qualified Ansible module names and valid module parameters. The directory-copy trailing slash explanation, `copy`/`template` distinction, `script` `creates` usage, `unarchive` local-source behavior, and `validate` examples align with current Ansible documentation.

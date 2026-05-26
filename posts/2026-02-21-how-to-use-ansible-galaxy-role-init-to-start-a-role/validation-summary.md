# Validation Summary: How to Use ansible-galaxy role init to Start a Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible roles
- YAML
- Jinja2 templates
- Molecule
- Docker-based Molecule scenarios

## Sources Consulted
- Ansible Community Documentation, ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation, roles and role directory structure: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation, archived Galaxy role skeleton behavior: https://docs.ansible.com/projects/ansible/2.8-archive/reference_appendices/galaxy.html
- Ansible Molecule documentation, command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule documentation, installation: https://docs.ansible.com/projects/molecule/installation/
- Local CLI verification with ansible-core 2.21.0 installed into an isolated temporary target.

## Issues Found
- The post said custom skeleton files were copied with Jinja2 variables expanded. Ansible renders `.j2` files outside the `templates/` directory, so the custom skeleton examples were changed from `meta/main.yml` and `molecule/default/converge.yml` to `.j2` files.
- The post showed generated test files using a `testservers` inventory group. Current `ansible-galaxy role init` output creates a localhost inventory and a localhost test play with `remote_user: root`, so those snippets were updated.
- The post described every generated `main.yml` as containing only a placeholder comment. Current generated files include SPDX headers and metadata content, so the wording was generalized to "basic placeholder content."
- The task example included `include_vars: "{{ ansible_os_family }}.yml"` but the post did not create those OS-specific variable files and already used dictionaries from `vars/main.yml`. That task was removed so the example is internally consistent.
- The Nginx template used the max-connections variable for `worker_processes`. This was changed to `worker_processes auto;` while keeping `webserver_max_connections` for `worker_connections`.
- The Molecule install command used the old `molecule-docker` package and the init command used the outdated `--driver-name docker` option. These were updated to `pip install molecule "molecule-plugins[docker]"` and `molecule init scenario`.

## Review Notes
The Molecule Docker example uses the pre-ansible-native driver-style configuration. That style is still documented, but Molecule's current documentation also highlights ansible-native scenarios and delegated/default-driver workflows for newer projects.

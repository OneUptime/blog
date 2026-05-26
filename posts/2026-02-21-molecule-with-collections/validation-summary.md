# Validation Summary: How to Use Molecule with Collections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible collections
- Ansible Galaxy
- Molecule
- Molecule Docker driver
- GitHub Actions
- YAML configuration
- Bash scripting

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible collection installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule playbook testing documentation: https://docs.ansible.com/projects/molecule/getting-started-playbooks/
- Molecule Docker example documentation: https://docs.ansible.com/projects/molecule/examples/docker/

## Issues Found
- The collection layout examples omitted the required `ansible_collections/` directory level. Updated the directory trees to show `collections_root/ansible_collections/my_namespace/my_collection/`, matching Ansible's documented collection search path layout.
- Several `ANSIBLE_COLLECTIONS_PATH` examples pointed at the `ansible_collections` directory itself or at the namespace level. Updated them to point at the parent directory that contains `ansible_collections`, as required by Ansible's `COLLECTIONS_PATHS` / `ANSIBLE_COLLECTIONS_PATH` behavior.
- The explanatory text said `ANSIBLE_COLLECTIONS_PATH` should contain `my_namespace/my_collection/`. Updated it to say the configured path should contain `ansible_collections/my_namespace/my_collection/`.

## Review Notes
- The local environment did not have `ansible`, `ansible-galaxy`, or `molecule` installed, so CLI behavior was verified against official documentation rather than local `--help` output.
- The post uses the pre-ansible-native Molecule Docker driver style. That remains valid, but current Molecule documentation also describes ansible-native scenarios as the newer approach.

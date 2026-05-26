# Validation Summary: How to Use Molecule to Test Multi-Host Scenarios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Molecule
- Molecule Docker driver
- Docker container networking
- PostgreSQL
- Nginx
- HAProxy
- Redis cluster test topology
- Mermaid diagrams

## Sources Consulted
- Ansible Molecule documentation: https://docs.ansible.com/projects/molecule/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule pre ansible-native configuration reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible playbook keywords reference: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/16/app-pg-isready.html

## Issues Found
- The debugging section described `molecule converge -- --limit webservers -m ping` as an ad-hoc command. Molecule passes arguments after `--` to `ansible-playbook`, and `-m ping` is an `ansible` ad-hoc command option, not an `ansible-playbook` option. Changed the text and command to show a valid limited converge command: `molecule converge -- --limit webservers`.

## Review Notes
- The post uses Molecule's pre ansible-native configuration style with `driver`, `platforms`, `provisioner`, and `verifier`, which remains documented for compatibility. Current Molecule documentation also highlights newer ansible-native patterns, so this could be noted in a future broader update.
- Molecule and Ansible were not installed in the local workspace, so CLI behavior was validated against the official Molecule command reference rather than local `--help` output.

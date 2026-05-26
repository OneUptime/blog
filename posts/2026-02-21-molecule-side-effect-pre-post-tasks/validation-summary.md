# Validation Summary: How to Use Molecule Side Effect for Pre/Post Test Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule scenarios and test sequences
- Molecule side_effect playbooks
- Ansible playbooks and built-in modules
- Nginx service testing
- logrotate
- OpenSSL

## Sources Consulted
- Ansible Molecule Configuration: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Workflow Reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule Command Line Reference: https://docs.ansible.com/projects/molecule/usage/
- ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- ansible.builtin.service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html

## Issues Found
- The Molecule test sequence diagram included a `lint` step. Current Molecule documentation lists the default `molecule test` sequence as `dependency`, `cleanup`, `destroy`, `syntax`, `create`, `prepare`, `converge`, `idempotence`, `side_effect`, `verify`, `cleanup`, `destroy`, with no `lint` action. Removed `lint` from the diagram.
- The post stated that no `molecule.yml` configuration is needed and that Molecule automatically looks for `side_effect.yml`. Current Molecule documentation says the side effect playbook is not enabled by default and should be configured under `provisioner.playbooks.side_effect`. Updated the text to require configuring Molecule to use the playbook.

## Review Notes
- The Ansible module examples use valid built-in modules and current FQCN-style names.
- Molecule and Ansible were not installed in the local environment, so command behavior and module details were verified against official documentation rather than local CLI help.
- Molecule's documentation still describes side effect playbooks as experimental in the pre ansible-native configuration section; the post's examples remain valid, but future readers may benefit from version-specific caveats if the article is expanded.

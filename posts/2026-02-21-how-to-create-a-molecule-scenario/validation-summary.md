# Validation Summary: How to Create a Molecule Scenario

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Galaxy
- Molecule
- Molecule Docker, Podman, and Vagrant drivers
- Molecule Ansible and Testinfra verifiers
- YAML
- Docker container configuration

## Sources Consulted
- Ansible Molecule command-line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule ansible-native configuration reference: https://docs.ansible.com/projects/molecule/ansible-native/
- Ansible Molecule installation guide: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule custom Docker image guide: https://docs.ansible.com/projects/molecule/guides/custom-image/
- Ansible Molecule systemd container guide: https://docs.ansible.com/projects/molecule/guides/systemd-container/
- Ansible Galaxy CLI reference for role initialization: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Testinfra documentation for pytest options and sudo execution: https://testinfra.readthedocs.io/en/latest/backends.html

## Issues Found
- The post used `molecule init role my_webserver --driver-name docker`. Current Molecule documentation lists `molecule init scenario`, while role skeleton creation belongs to `ansible-galaxy role init`. I changed the example to create the role with `ansible-galaxy role init my_webserver`, enter the role directory, and then run `molecule init scenario --driver-name docker`.
- The main `molecule.yml` example included a top-level `lint` block. Molecule's current command reference no longer includes a `lint` action, and the installation guide states that `ansible-lint` is installed and run separately. I removed the `lint` block from the Molecule configuration example.

## Review Notes
- The post uses Molecule's pre-ansible-native `driver`, `platforms`, `provisioner`, and `verifier` structure. Current Molecule documentation still documents this as a pre-ansible-native configuration style, but newer projects may prefer the ansible-native `ansible:` configuration section.
- Docker, Podman, and Vagrant drivers require their respective Molecule driver/plugin packages and platform dependencies to be installed separately.
- All YAML snippets in the post were parsed successfully after the edits.

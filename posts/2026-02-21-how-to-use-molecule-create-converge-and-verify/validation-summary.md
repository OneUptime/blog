# Validation Summary: How to Use Molecule create, converge, and verify

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Molecule
- Molecule scenarios and lifecycle commands
- Docker-based Molecule test instances
- Ansible verifier
- Testinfra verifier

## Sources Consulted
- Ansible Molecule Command Line Reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule Workflow Reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule Configuration Reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Ansible-native Configuration Reference: https://docs.ansible.com/projects/molecule/ansible-native/
- Ansible Molecule Docker example: https://docs.ansible.com/projects/molecule/examples/docker/
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `community.docker.docker_container` module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- Testinfra module documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- Local temporary Molecule 26.4.0 CLI help output for `create`, `converge`, `verify`, `test`, and global options.

## Issues Found
- `molecule create -- -vvv` is not valid for current Molecule because `create` does not accept Ansible pass-through arguments. Changed it to `molecule -vvv create`, using Molecule's global verbosity option.
- The post said Molecule records state in a `.molecule/` directory. Current Molecule documentation describes the ephemeral/cache directory, usually under `~/.cache/molecule/`. Updated the wording.
- The custom Docker `create.yml` example created containers but did not create the Docker network or write a Molecule inventory file, so later `converge` steps would not know how to connect to the containers. Updated the example to create the network and write `molecule_inventory.yml` in the ephemeral inventory directory.
- The post said `converge` skips creation. Current Molecule's converge sequence includes `dependency`, `create`, `prepare`, and `converge`; when instances already exist, create usually has nothing new to provision. Updated the explanation.
- `molecule verify -- -k`, `molecule verify -- -v`, and `molecule verify -- -vvv` are not valid for current Molecule's `verify` command. Replaced verbosity commands with global Molecule verbosity and moved the Testinfra `-k` example into verifier configuration.
- `molecule converge --no-dependency` is not a current Molecule option. Replaced it with the documented `dependency.enabled: false` configuration.

## Review Notes
The Testinfra service example assumes the test instance has a service manager that can report `nginx` status. That is valid in suitable VM or systemd-enabled container scenarios, but plain minimal containers may need a different assertion.

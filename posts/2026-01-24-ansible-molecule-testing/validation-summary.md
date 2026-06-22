# Validation Summary: How to Configure Ansible Molecule for Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker, Podman, and Vagrant drivers
- Ansible playbooks and modules
- Testinfra / pytest-testinfra
- GitHub Actions
- GitLab CI
- Docker-in-Docker
- YAML configuration

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre ansible-native configuration reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule Docker example: https://docs.ansible.com/projects/molecule/examples/docker/
- Ansible Molecule Podman example: https://docs.ansible.com/projects/molecule/examples/podman/
- molecule-plugins repository: https://github.com/ansible-community/molecule-plugins
- Ansible `apt_key` and `deb822_repository` module documentation via local `ansible-doc` for ansible-core 2.21.0
- Testinfra documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- pytest-testinfra PyPI page: https://pypi.org/project/pytest-testinfra/

## Issues Found
- The installation commands used obsolete Molecule extras such as `molecule[docker]` and `molecule[podman]`. Current Molecule 26.4.0 package metadata does not provide those extras, and official documentation points users to separate `molecule-plugins[...]` packages for drivers. Updated commands to install `molecule` with `molecule-plugins[docker]`, `molecule-plugins[podman]`, and `molecule-plugins[docker,podman,vagrant]`.
- The Testinfra section did not tell readers to install the current package name. Added `python3 -m pip install pytest-testinfra`, matching the pytest-testinfra project guidance.
- The version example referenced older Molecule, Ansible, and standalone docker driver output. Updated it to a current-style Molecule 26.x / ansible-core 2.21 / `molecule_plugins` example.
- The role initialization command used `molecule init role`, which is not the current documented workflow. Updated it to create the role with `ansible-galaxy role init` and then add a Molecule scenario with `molecule init scenario --driver-name docker`.
- The prepare playbook used deprecated `ansible.builtin.apt_key`. Replaced it with `ansible.builtin.deb822_repository` and enabled `install_python_debian` so the module can satisfy its Debian Python dependency on fresh targets.
- The GitHub Actions example defined a distro matrix and `MOLECULE_DISTRO` environment variable that the shown Molecule configuration did not consume. Removed the unused distro matrix to avoid implying those values affect the test run.
- The GitLab CI matrix set `SCENARIO` but ran plain `molecule test`, so every matrix job would run the default scenario instead of the matrix scenario. Updated the script to run `molecule test --scenario-name "$SCENARIO"`.

## Review Notes
The post uses the pre ansible-native Molecule driver/platform/provisioner configuration style. Current Molecule documentation keeps this style for compatibility, while newer examples increasingly show ansible-native inventory and lifecycle playbooks. The retained examples are technically valid, but a future rewrite could explain that distinction explicitly.

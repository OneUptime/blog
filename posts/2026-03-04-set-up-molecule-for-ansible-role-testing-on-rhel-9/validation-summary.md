# Validation Summary: How to Set Up Molecule for Ansible Role Testing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Molecule
- Ansible and ansible-core
- Ansible Galaxy collections
- Podman and Docker Molecule drivers
- ansible-lint and yamllint
- Testinfra / pytest-testinfra
- GitHub Actions

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Podman example: https://docs.ansible.com/projects/molecule/examples/podman/
- Ansible Galaxy CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible collection installation documentation: https://docs.ansible.com/ansible/latest/collections_guide/collections_installing.html
- ansible.builtin.service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- ansible-lint YAML rule documentation: https://docs.ansible.com/projects/lint/rules/yaml/
- Testinfra documentation: https://testinfra.readthedocs.io/
- pytest-testinfra PyPI project: https://pypi.org/project/pytest-testinfra/
- GitHub Actions Python workflow documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/python

## Issues Found
- The Molecule install commands omitted `ansible-core`. Current Molecule installation guidance shows installing Molecule with Ansible, and local CLI inspection confirmed Molecule needs Ansible CLI tools such as `ansible-config`. Updated the Podman, Docker, and CI install commands to include `ansible-core`.
- The `molecule init role ... --driver-name podman` command is no longer valid in current Molecule. Replaced it with `ansible-galaxy role init my_webserver` followed by `molecule init scenario default`.
- The `molecule init scenario --driver-name podman --scenario-name multi-os` command is no longer valid in current Molecule. Replaced it with `molecule init scenario multi-os`.
- The role used `ansible.posix.firewalld` without installing the `ansible.posix` collection. Added `ansible-galaxy collection install ansible.posix` to local and CI setup.
- The firewalld conditional referenced `ansible_facts.services` without first collecting service facts. Added an `ansible.builtin.service_facts` task and used bracket notation consistent with the module documentation.
- The `provisioner.lint` configuration is not part of the current Molecule provisioner schema. Removed it from the sample `molecule.yml`.
- The linting section used deprecated Molecule lint configuration. Updated it to run `yamllint .` and `ansible-lint` as separate commands alongside Molecule.
- The Testinfra package install command used the old `testinfra` package name. Updated it to `pytest-testinfra`, matching current Testinfra documentation.
- The UBI 9 container platform was named as RHEL. Renamed the sample platform from `rhel9` / `rhel9-instance` to `ubi9` / `ubi9-instance` to match the actual image used.

## Review Notes
The post still uses Molecule's driver-based configuration for Podman and Docker. Current Molecule documentation increasingly emphasizes ansible-native scenarios, but the driver-based `molecule-plugins` path remains available and documented for Podman/Docker use. The sample uses privileged systemd containers, which is common for service-role testing but should be treated as a local test convenience rather than a production security pattern.

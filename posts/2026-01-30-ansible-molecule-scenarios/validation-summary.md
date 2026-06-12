# Validation Summary: How to Create Ansible Molecule Scenarios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Molecule
- Molecule driver plugins for Docker, Podman, Vagrant, EC2, and default delegated infrastructure
- ansible-lint
- GitHub Actions
- GitLab CI
- Docker and Podman container platforms

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre-ansible-native configuration reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule custom Docker image guide: https://docs.ansible.com/projects/molecule/guides/custom-image/
- ansible-community molecule-plugins repository/package information: https://github.com/ansible-community/molecule-plugins
- Local verification with Molecule 26.4.0 CLI help and generated scenario template.

## Issues Found
- The installation commands used older standalone driver packages such as `molecule-docker`, `molecule-podman`, and `molecule-vagrant`. Updated them to current `molecule-plugins[...]` driver extras and included `ansible-core`.
- The role/scenario initialization examples used `molecule init role` and `molecule init scenario --driver-name docker`, which are not valid in current Molecule. Updated the role flow to `ansible-galaxy role init` followed by `molecule init scenario`, and removed the obsolete `--driver-name` flags.
- The default generated scenario tree omitted `create.yml` and `destroy.yml`, which current `molecule init scenario` generates. Updated the tree.
- The Galaxy dependency example only set `requirements-file`, which is for collections in current Molecule. Added `role-file` so a combined `requirements.yml` can be used for roles and collections.
- The `prepare.yml` example used `ansible_os_family` before ensuring Python and facts were available. Updated it to disable initial fact gathering, install Python with a raw OS check, and then gather facts.
- The Docker example included obsolete `provisioner.lint` configuration. Replaced the linting guidance with a standalone `ansible-lint` CI step.
- The delegated driver example used `driver.name: delegated`, which is not a current Molecule driver name. Updated it to `driver.name: default`.
- The GitHub Actions and GitLab CI install steps used the old Docker driver package. Updated them to install `molecule-plugins[docker]`.
- The GitLab CI matrix defined `MOLECULE_SCENARIO` but ran plain `molecule test`, so every matrix job would run the default scenario. Updated the script to pass `--scenario-name "$MOLECULE_SCENARIO"`.

## Review Notes
The post primarily uses Molecule's pre-ansible-native configuration style, which current Molecule documentation still documents for compatibility. Future updates could consider adding an ansible-native example, but the corrected pre-ansible-native examples are still technically valid.

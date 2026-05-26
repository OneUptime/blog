# Validation Summary: How to Use InSpec for Ansible Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker driver
- Testinfra / pytest-testinfra
- ansible-lint
- yamllint
- GitHub Actions
- GitLab CI
- community.general Ansible collection

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- Ansible Molecule workflow documentation: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule overview: https://docs.ansible.com/projects/molecule/
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Testinfra documentation: https://testinfra.readthedocs.io/en/latest/
- Chef InSpec profile controls documentation: https://docs.chef.io/inspec/7.0/profiles/controls/

## Issues Found
- The post title, tags, description, and opening paragraph claimed the article was about Chef InSpec, but the examples and workflow were for Molecule, Ansible verifier playbooks, and Testinfra. Updated the metadata and introduction to match the actual technologies demonstrated.
- The installation command used `molecule-docker` and `testinfra`. Current Molecule documentation points Docker-driver users to `molecule-plugins[docker]`, and current Testinfra documentation installs the pytest plugin as `pytest-testinfra`. Updated the install command accordingly.
- The GitHub Actions example defined a distro matrix, including `debian12`, but the provided `molecule.yml` only defined `ubuntu2404` and `rocky9`, and the `MOLECULE_DISTRO` environment variable was not used by the configuration. Simplified the workflow to run `molecule test` against the platforms already configured.
- The GitHub Actions and GitLab CI examples installed the outdated Docker driver package. Updated both to install `ansible-core`, `molecule`, and `molecule-plugins[docker]`.
- The GitLab CI Molecule job used `docker:latest` and then ran `pip`, which is not available in that image by default. Updated the job to use the Docker-in-Docker pattern from Molecule's CI documentation and install Python/pip dependencies before running Molecule.
- The infrastructure workflow used `ansible.builtin.timezone`, which is not the documented current FQCN for the timezone module. Changed it to `community.general.timezone`.
- The SSH restart handler used `sshd` for every host, which is incorrect for Debian/Ubuntu systems where the service is commonly named `ssh`. Updated the handler to choose `ssh` on Debian-family systems and `sshd` elsewhere.
- Several generated phrases referred to "this module" even though the post is not about a single Ansible module. Reworded those references to "these patterns" or "playbooks".

## Review Notes
The Molecule configuration uses the pre-ansible-native Docker driver style. It remains valid when the Docker driver plugin is installed, but future updates could modernize the example to Molecule's ansible-native style. The examples using `community.general.ufw` and `community.general.timezone` require the `community.general` collection to be installed in the execution environment.

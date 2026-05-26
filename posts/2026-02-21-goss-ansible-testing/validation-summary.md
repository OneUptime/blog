# Validation Summary: How to Use Goss for Ansible Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Goss
- YAML
- GitHub Actions
- GitLab CI
- Testinfra
- Docker-based role testing

## Sources Consulted
- Goss README and installation instructions: https://github.com/goss-org/goss
- Goss command reference: https://goss.readthedocs.io/en/stable/cli/
- Goss gossfile resource format: https://goss.readthedocs.io/en/stable/gossfile/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- ansible.builtin.copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.wait_for module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Testinfra documentation: https://testinfra.readthedocs.io/

## Issues Found
- The post described Goss-based validation but did not include a Goss test file or any `goss validate` execution. Added a `tests/validation/goss.yaml` example and changed the Molecule verification playbook to copy and run Goss on each test instance.
- The setup command installed `testinfra`, but current Testinfra documentation uses the `pytest-testinfra` package name. Updated the installation command.
- The setup section used the `community.general.ufw` module later in the post without installing the `community.general` collection when using `ansible-core`. Added the `ansible-galaxy collection install community.general` command.
- The Goss binary was missing from setup and CI. Added a project-local `bin/goss` download step and copied that binary into the Molecule test instances before running validation.
- The GitHub Actions matrix included `debian12`, but the Molecule platform list only defined `ubuntu2404` and `rocky9`. Updated the matrix to match the defined platforms.
- The GitLab CI example used `docker:latest` while running `pip install`, which is not a reliable Python environment. Switched the job image to `python:3.11` and configured Docker-in-Docker environment variables for Molecule's Docker driver.

## Review Notes
The examples are representative and still depend on the sample role actually creating `my_service`, `/etc/my_service/config.yml`, and the health endpoint on port 8080. The Molecule Docker setup may require a CI runner that permits Docker-in-Docker or privileged containers.

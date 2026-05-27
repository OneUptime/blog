# Validation Summary: How to Write Ansible Assert-Based Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible assert-based validation
- Molecule role testing
- Docker-backed Molecule scenarios
- GitHub Actions and GitLab CI
- pytest-testinfra
- community.general collection modules

## Sources Consulted
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Testinfra documentation: https://testinfra.readthedocs.io/en/latest/
- pytest-testinfra PyPI package: https://pypi.org/project/pytest-testinfra/

## Issues Found
- The dependency installation command used outdated package names for current Molecule Docker usage and Testinfra. Changed `molecule-docker` to `molecule-plugins[docker]` and `testinfra` to `pytest-testinfra`.
- The `service_facts` assertion checked for `my_service`, but systemd service facts are commonly keyed by full unit names such as `my_service.service`. Updated the example to assert against `my_service.service`.
- The GitHub Actions matrix included `debian12` even though the Molecule scenario only defined `ubuntu2404` and `rocky9`, and the `MOLECULE_DISTRO` environment variable was not consumed by the shown Molecule configuration. Updated the matrix to defined platforms and used `molecule test -- --limit`.
- The GitLab CI job used the Docker image without installing Python and pip first. Added Alpine package installation, a virtual environment, and the current Molecule Docker plugin package.
- The infrastructure example used `ansible.builtin.timezone`, but the current timezone module is `community.general.timezone`. Updated the FQCN.
- The SSH hardening `lineinfile` regexes did not match commented default settings. Updated them to match commented or uncommented directives.
- The UFW tasks could fail on hosts where UFW was not installed or available. Added a Debian-family UFW installation task and limited the UFW tasks to Debian-family systems.
- The SSH handler used `sshd`, which is not the service name on Debian-family systems. Updated it to choose `ssh` for Debian-family systems and `sshd` elsewhere.
- The fallback command in the error-handling example would stop the play before the final failure check if the fallback failed. Added `failed_when: false` to the fallback task.
- The scheduling example copied a file into `/opt/scripts` without creating the parent directory. Added a directory creation task before the copy task.

## Review Notes
The examples remain illustrative and use placeholder service names, URLs, scripts, and inventory paths. Real projects should pin tool versions in CI, define collection requirements explicitly, and use container images suitable for running systemd when testing services in Molecule.

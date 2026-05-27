# Validation Summary: How to Test Ansible Playbooks Against Multiple OS Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible and ansible-core
- Molecule
- Molecule Docker driver
- ansible-lint
- yamllint
- pytest-testinfra
- GitHub Actions
- GitLab CI with Docker-in-Docker
- community.general Ansible collection

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule custom image documentation: https://docs.ansible.com/projects/molecule/guides/custom-image/
- Ansible Molecule workflow and command-line documentation: https://docs.ansible.com/projects/molecule/workflow/ and https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible hostname module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- community.general ufw module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- GitHub Actions setup-python documentation: https://github.com/actions/setup-python
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- yamllint quickstart documentation: https://yamllint.readthedocs.io/en/latest/quickstart.html
- pytest and pytest-testinfra package documentation: https://docs.pytest.org/ and https://pypi.org/project/pytest-testinfra/

## Issues Found
- The installation command used the legacy `molecule-docker` package. Updated it to install the current Molecule Docker plugin through `molecule-plugins[docker]`.
- The installation command used `testinfra`; updated it to `pytest-testinfra`, the current package name for pytest-based Testinfra tests.
- The examples used `community.general.ufw` and timezone functionality while only installing `ansible-core`. Added `ansible-galaxy collection install community.general`.
- The Molecule platform list used `pre_build_image: true` with bare OS images, which would not customize the image for Ansible execution. Changed the platforms to `pre_build_image: false` and added `Dockerfile.j2` to the project structure.
- The GitHub Actions matrix included `debian12`, but the Molecule platform list did not. Added a `debian12` platform.
- The GitHub Actions snippet set `MOLECULE_DISTRO` but the Molecule configuration did not consume it. Changed the test command to pass an Ansible `--limit` for the matrix platform.
- The GitLab CI Molecule job used `docker:latest` but then ran `pip install`, which is not available without Python and pip in that image. Updated the job to use the Docker-in-Docker image pattern with `apk add` for Python and build dependencies.
- The idempotency section said Molecule automatically tests idempotency by running `converge` twice, which is imprecise. Updated it to say the default `molecule test` sequence includes an idempotence step after converge.
- The infrastructure example used `ansible.builtin.timezone`, but the current module is `community.general.timezone`. Updated the FQCN.
- The infrastructure example installed `htop`, which is not reliably available from base repositories across the shown OS families. Removed it from the generic package list.
- The infrastructure example used UFW on all OS families even though `community.general.ufw` targets UFW-based systems and requires the `ufw` package. Added Debian-family guards to the UFW tasks.
- The infrastructure example configured UFW without installing the `ufw` package. Added a Debian-family package installation task before the UFW configuration tasks.
- The SSH restart handler used `sshd`, which is not the service name on Debian/Ubuntu. Updated the handler to use `ssh` on Debian-family systems and `sshd` elsewhere.
- The Common Use Cases text referred to "this module" even though the post is not about an Ansible module. Updated that wording to "this testing approach."

## Review Notes
The snippets were reviewed against current official documentation and parsed locally for YAML/Python syntax. The Molecule examples still assume an appropriate Dockerfile template and host Docker environment for full runtime execution.

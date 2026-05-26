# Validation Summary: How to Run Ansible Playbooks in GitLab CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- Ansible Vault
- Ansible dynamic inventory
- ansible-lint
- GitLab CI/CD
- GitLab environments, protected variables, and deployment approvals
- Docker
- SSH
- AWS inventory dependencies

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible release and maintenance policy: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible configuration settings, including `ANSIBLE_COLLECTIONS_PATH` and `ANSIBLE_HOST_KEY_CHECKING`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `ansible-playbook` CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible-galaxy` CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible collections installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- GitLab environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab deployment approvals documentation: https://docs.gitlab.com/ci/environments/deployment_approvals/
- GitLab protected environments documentation: https://docs.gitlab.com/ci/environments/protected_environments/
- PyPI package index checks for current `ansible`, `ansible-core`, and `ansible-lint` package versions.

## Issues Found
- The post pinned `ansible==8.7.0`, which maps to an unmaintained Ansible community package line. Updated examples to `ansible==13.7.0`, the current Ansible community package available during review.
- The examples used `python:3.11-slim`, but the current Ansible 13 / ansible-core 2.20 controller support requires Python 3.12 through 3.14. Updated pipeline and Dockerfile examples to `python:3.12-slim`.
- The examples installed collections into `.ansible/collections` without configuring Ansible to search that path. Added `ANSIBLE_COLLECTIONS_PATH: "$CI_PROJECT_DIR/.ansible/collections"` and used that path consistently with `ansible-galaxy collection install --collections-path`.
- The complete pipeline claimed collection caching as a tip but cached only pip packages. Added `.ansible/collections` to the complete pipeline cache paths.
- The SSH setup snippet used `ssh-keyscan` from `openssh-client` without installing that package in the `python:*-slim` image. Added `apt-get install -y --no-install-recommends openssh-client`.
- The examples populated `known_hosts` while disabling host key checking. Changed `ANSIBLE_HOST_KEY_CHECKING` to `"true"` so the `known_hosts` setup is meaningful and aligns with the post's security guidance.
- The dynamic inventory section called AWS inventory configuration a "script". Updated the wording to "dynamic inventory plugins" and clarified the AWS example comment.
- The protected environments section implied deployment approvals are universally available. Added a short GitLab tier caveat.

## Review Notes
The GitLab CI/CD YAML structure, `rules`, `needs`, `environment`, `on_stop`, `action: stop`, and manual deployment examples are consistent with GitLab documentation. The Ansible CLI flags used for syntax checking, inventory selection, extra vars, and vault password files are current. The snippets are illustrative and still assume the repository provides matching `requirements.yml`, inventories, playbooks, CI/CD variables, and known host entries.

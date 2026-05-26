# Validation Summary: How to Run Ansible in a Docker Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- Ansible Galaxy collections
- Docker
- Docker Compose
- GitHub Actions
- GitLab CI/CD
- SSH agent forwarding

## Sources Consulted
- Ansible Execution Environments documentation: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/index.html
- Ansible community EE image documentation: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/run_community_ee_image.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker container run documentation: https://docs.docker.com/engine/containers/run/
- Docker host network driver documentation: https://docs.docker.com/engine/network/tutorials/host/
- Docker Desktop SSH agent forwarding documentation: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- GitLab CI/CD YAML syntax documentation: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The Vault environment variable example used `ANSIBLE_VAULT_PASSWORD` to pass a raw password. Ansible documents `ANSIBLE_VAULT_PASSWORD_FILE`, not a raw vault password environment variable, so the example was changed to mount a vault password file and set `ANSIBLE_VAULT_PASSWORD_FILE=/root/.vault_pass`.
- The Docker Compose example used the top-level `version: "3.8"` field. Docker Compose now treats this field as obsolete and informational, so it was removed from the example.
- The networking note said `--network host` was Linux-only and did not work the same way on macOS and Windows. Docker now documents host networking as supported in Docker Desktop 4.34 and later as an opt-in feature, so the caveat was updated.

## Review Notes
- The examples assume the referenced inventories, playbooks, vault password file, and collection requirements files exist in the user's project.
- The GitHub Actions example both adds a host key with `ssh-keyscan` and disables Ansible host key checking. This is technically valid but weakens SSH verification; future revisions could avoid disabling host key checking when known hosts are configured.

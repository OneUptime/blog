# Validation Summary: How to Use Ansible become in CI/CD Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible become / sudo privilege escalation
- Ansible Vault
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- SSH

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/user_guide/become.html
- Ansible sudo become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible logging and no_log documentation: https://docs.ansible.com/ansible/latest/reference_appendices/logging.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- GitLab CI/CD YAML syntax documentation: https://docs.gitlab.com/ee/ci/yaml/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins credentials binding documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Official Python Docker image source: https://github.com/docker-library/python/blob/master/3.11/slim-bookworm/Dockerfile

## Issues Found
- The become password environment variable was shown as `ANSIBLE_BECOME_PASSWORD`, but the current sudo become plugin documents `ANSIBLE_BECOME_PASS` and `ANSIBLE_SUDO_PASS` for the sudo password. Changed the example to `ANSIBLE_BECOME_PASS`.
- The GitLab CI example used `python:3.11-slim` and then ran SSH-based Ansible commands without installing an SSH client. Added `openssh-client` installation in `before_script`.
- The troubleshooting section stated that a vault password file created with a trailing newline causes decryption to fail. A normal single-line vault password file is supported; the more accurate CI/CD issue is unintended whitespace or line endings in the secret value. Reworded the bullet and the `printf '%s'` example accordingly.

## Review Notes
The examples intentionally disable host key checking in several CI snippets, which is common for simplified CI examples but weakens SSH trust verification. For production use, prefer managing `known_hosts` and keeping host key checking enabled where practical.

# Validation Summary: How to Migrate from ansible-playbook to ansible-navigator

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible
- ansible-playbook
- ansible-navigator
- Ansible Execution Environments
- ansible-builder
- Podman/container images
- Ansible Vault

## Sources Consulted
- Ansible Navigator documentation: https://docs.ansible.com/projects/navigator/
- Ansible Navigator settings reference: https://docs.ansible.com/projects/navigator/settings/
- Ansible Navigator subcommands reference: https://docs.ansible.com/projects/navigator/subcommands/
- Ansible Navigator FAQ: https://docs.ansible.com/projects/navigator/faq/
- Ansible ansible-playbook CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Execution Environments guide: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/
- Running Ansible with the community EE image: https://docs.ansible.com/ansible/latest/getting_started_ee/run_community_ee_image.html
- Ansible Builder CLI usage: https://docs.ansible.com/projects/builder/en/latest/usage/

## Issues Found
- The post described `--mode stdout` output as identical to `ansible-playbook`. Updated the wording to "ansible-playbook-style" because ansible-navigator still has its own execution behavior, settings, artifacts, and prompt handling.
- The verbose-output translation changed `ansible-playbook site.yml -vvv` to `ansible-navigator run site.yml -v`, which would not preserve the requested verbosity level. Updated it to pass `-vvv`.
- The `--ask-vault-pass` example used `--mode stdout` without `--enable-prompts`. Updated the command to use `--enable-prompts`, which the ansible-navigator docs describe for password and playbook prompts.
- The community EE image examples used the outdated `quay.io/ansible/community-ee-minimal:latest` path. Updated them to the currently documented `ghcr.io/ansible-community/community-ee-minimal:latest` image.
- The "larger community EE" wording was made more precise by referring to the community EE base image.

## Review Notes
The migration approach is technically sound overall. Current Ansible Navigator documentation recommends `ansible-dev-tools` as the preferred installer bundle, but direct `pip install ansible-navigator` remains documented in the Execution Environments setup guide, so the installation example is still valid.

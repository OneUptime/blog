# Validation Summary: How to Run Ansible Playbooks with ansible-navigator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-navigator
- Ansible execution environments
- Ansible Vault
- Ansible playbooks
- community.docker collection
- Podman and Docker container runtimes

## Sources Consulted
- Ansible Navigator documentation: https://docs.ansible.com/projects/navigator/
- Ansible Navigator installation documentation: https://docs.ansible.com/projects/navigator/installation/
- Ansible Navigator settings documentation: https://docs.ansible.com/projects/navigator/settings/
- Ansible Navigator FAQ: https://docs.ansible.com/projects/navigator/faq/
- Ansible execution environments guide: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/run_community_ee_image.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html

## Issues Found
- The introduction described ansible-navigator as the modern replacement for ansible-playbook. Updated this to describe it as a modern interface for running and troubleshooting Ansible content, which matches the official positioning more accurately.
- The installation section said to install ansible-navigator alongside ansible-builder, but ansible-builder is not required to run playbooks with ansible-navigator. Updated the wording to install ansible-navigator from PyPI.
- The execution environment section said ansible-navigator pulls and uses a community EE image by default. Updated the wording to avoid implying a specific community image is always the default, while still noting that EEs are enabled by default when a container runtime is available.
- The Vault prompt example used `--ask-vault-pass --mode stdout`. Updated it to use `--enable-prompts`, because ansible-navigator documents this setting for password and playbook prompts.
- The Vault password file section said ansible-navigator handles vault password files by mounting common paths. Updated it to say that files outside the project directory may require additional volume mounts.
- The examples used lowercase boolean values for ansible-navigator settings. Updated `--execution-environment false` and `--playbook-artifact-enable false` to the documented `False` value.
- The artifact section said artifacts are saved by default in the current directory. Updated this to say they are saved next to the playbook by default.
- The production deployment playbook defined `app_version: "{{ app_version }}"`, which can cause recursive variable templating. Removed the redundant `vars` block so the extra variable passed on the command line is used directly.

## Review Notes
The local environment did not have `ansible-navigator` or `ansible-playbook` installed, so CLI behavior was verified against the official documentation rather than local `--help` output. The `community.docker.docker_image` example still uses a supported module, but the official collection documentation now recommends the more specific image modules such as `community.docker.docker_image_pull` for new content.

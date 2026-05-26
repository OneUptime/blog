# Validation Summary: How to Define Execution Environment Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Execution Environments
- Ansible Builder
- Ansible Galaxy collections and roles
- pip requirements files
- bindep system dependency files
- Container base images for EEs

## Sources Consulted
- Ansible Builder execution environment definition: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage and introspect command: https://docs.ansible.com/projects/builder/en/latest/usage/
- Ansible Builder collection-level dependencies: https://docs.ansible.com/projects/builder/en/latest/collection_metadata/
- Ansible collection installation and requirements files: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Builder installation/base image requirements: https://docs.ansible.com/projects/builder/en/latest/installation/
- bindep requirements file and selector format: https://docs.opendev.org/opendev/bindep/latest/readme.html
- pip install command reference: https://pip.pypa.io/en/stable/cli/pip_install/

## Issues Found
- The post said ansible-builder reads Python dependencies from a collection `requirements.txt` "in its metadata" and showed `ansible-galaxy collection info ... --format json` to inspect them. Current Ansible Builder documentation says collection EE dependencies are found through `meta/execution-environment.yml`, or root-level `requirements.txt` and `bindep.txt` files, and `ansible-builder introspect` is the supported inspection command. Updated the explanation and command.
- The Galaxy validation command used `ansible-galaxy collection install -r requirements.yml --dry-run`, but the current `ansible-galaxy collection install` CLI does not support `--dry-run`. Replaced it with collection and role installs into temporary paths.
- The system dependencies section implied EE builds can use arbitrary distribution package managers. Current Ansible Builder 3.x documentation requires RPM-based EE base images using `dnf` or `microdnf`. Updated the text to clarify that RPM/RHEL selectors are the relevant selectors for EE builds.
- The bindep selector list described `platform:rhel-9` as "RHEL". Corrected it to "RHEL 9".

## Review Notes
The remaining examples are technically plausible for the topic, but the base image examples use `quay.io/ansible/ansible-runner:latest` rather than the newer `docker.io/redhat/ubi9:latest` sample shown in current Ansible Builder 3.x documentation. This is not inherently invalid, but a future refresh could align the examples with the latest upstream sample base image.

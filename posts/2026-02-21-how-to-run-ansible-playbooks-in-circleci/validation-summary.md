# Validation Summary: How to Run Ansible Playbooks in CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible Vault
- ansible-lint
- CircleCI workflows
- CircleCI contexts
- CircleCI caching
- CircleCI Docker executors
- Docker
- SSH

## Sources Consulted
- CircleCI Configuration Reference: https://circleci.com/docs/reference/configuration-reference/
- CircleCI Contexts documentation: https://circleci.com/docs/contexts/
- CircleCI Workflows documentation: https://circleci.com/docs/workflows/
- CircleCI Resource Class documentation: https://circleci.com/docs/guides/execution-managed/resource-class-overview/
- Ansible release and maintenance documentation: https://docs.ansible.com/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible installation guide: https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible collections installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- ansible-lint installation documentation: https://docs.ansible.com/projects/lint/installing/
- PyPI package metadata for ansible and ansible-lint dependency resolution.

## Issues Found
- The examples pinned `ansible==8.7.0` on `python:3.11-slim`. Ansible 8 is outdated, and current Ansible 13 uses ansible-core 2.20, whose control node support is Python 3.12 through 3.14. Updated the examples to `python:3.12-slim` and `ansible==13.7.0`.
- The full pipeline cache used `requirements.txt`, but the examples install Ansible collections from `requirements.yml`. Updated the cache checksum to `requirements.yml`.
- The full pipeline cache saved Python site-packages under a Python 3.11 path. Updated the cache paths to cache pip downloads and installed Ansible collections instead.
- The custom Docker image installed Ansible collections as root into root's home directory, then switched to the `circleci` user. Updated the collection install command to install into `/usr/share/ansible/collections`, which is in Ansible's standard collection search path.
- The approval-gate tip implied that only permitted users can approve an approval job. CircleCI documents that an approval job may be approved by project members, while restricted downstream contexts enforce authorization. Updated the wording to describe that behavior accurately.

## Review Notes
The CircleCI YAML snippets parse as valid YAML. The examples still use placeholder hosts, registry names, contexts, and playbook paths that users must replace for their own projects.

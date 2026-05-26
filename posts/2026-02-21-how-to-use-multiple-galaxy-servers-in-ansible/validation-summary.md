# Validation Summary: How to Use Multiple Galaxy Servers in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible collections
- Red Hat Automation Hub
- Galaxy NG
- `ansible.cfg`
- `ansible-galaxy` CLI
- Ansible Vault
- GitHub Actions
- Bash
- Nginx

## Sources Consulted
- Ansible Community Documentation: Galaxy User Guide - https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: `ansible-galaxy` CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Ansible configuration settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Red Hat Documentation: Configuring Red Hat automation hub as the primary source for content - https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/getting_started_with_automation_hub/configure-hub-primary
- GitHub Actions Documentation: Store information in variables - https://docs.github.com/actions/learn-github-actions/variables

## Issues Found
- Updated Red Hat hosted Automation Hub examples from `https://cloud.redhat.com/api/automation-hub/content/published/` to the current documented `https://console.redhat.com/api/automation-hub/content/published/`.
- Fixed the Ansible Vault example so the decrypted keys uppercase to the actual Ansible Galaxy environment variables (`ANSIBLE_GALAXY_SERVER_PRIVATE_HUB_TOKEN` and `ANSIBLE_GALAXY_SERVER_CERTIFIED_HUB_TOKEN`).
- Corrected the GitHub Actions example so the Galaxy token is available to the `ansible-galaxy collection install` step. An `export` in a separate `run` step would not persist to later steps.
- Fixed the Galaxy timeout configuration key from `timeout` to `server_timeout`, matching Ansible's `GALAXY_SERVER_TIMEOUT` setting.
- Revised the failover wording. Official documentation says `server_list` is searched in order until a collection is found, but it does not provide smart failover or load balancing for unhealthy servers.
- Removed the inaccurate implication that there is no built-in caching, since the current `ansible-galaxy` CLI documents server response cache options.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so CLI flags were validated against the official Ansible CLI reference instead of local `--help` output.

# Validation Summary: How to Install Ansible Collections from Automation Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible collections
- Red Hat Automation Hub
- Private Automation Hub / Galaxy NG
- Pulp Ansible

## Sources Consulted
- Ansible Community Documentation: Installing collections and configuring the ansible-galaxy client - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Ansible configuration file search order and GALAXY_SERVER_LIST - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Red Hat Documentation: Getting started with automation hub, configuring Automation Hub as a content source - https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/getting_started_with_automation_hub/
- Red Hat Documentation: Managing content in automation hub, repositories, remotes, sync, and approval flow - https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/managing_content_in_automation_hub/managing-collections-hub
- Galaxy NG Documentation: Collections, upload repositories, sync, and ansible-galaxy configuration - https://docs.ansible.com/projects/galaxy-ng/en/latest/usage_guide/collections.html
- Pulp Ansible Documentation: Collection workflows and Pulp CLI sync commands - https://pulpproject.org/pulp_ansible/docs/user/guides/collections/

## Issues Found
- The private Automation Hub `ansible.cfg` example used `https://pah.internal.example.com/api/galaxy/content/published/` while the same server entry was later used for `ansible-galaxy collection publish --server private_hub`. Galaxy NG documentation states that upload requires the `/api/galaxy/` repository URL, because `/api/galaxy/content/published/` does not work for uploads. Changed the private hub URL to `https://pah.internal.example.com/api/galaxy/` so the install and publish examples are consistent.
- The programmatic sync example used an unsupported raw `curl` call to `https://pah.internal.example.com/api/galaxy/content/staging/v3/sync/`. Replaced it with documented Pulp CLI commands that create a collection remote with a requirements payload and sync a repository from that remote.

## Review Notes
- The environment did not have `ansible-galaxy` or `ansible-config` installed, so CLI behavior was verified against official Ansible, Red Hat, Galaxy NG, and Pulp Ansible documentation rather than local command output.
- The post's note that Jinja lookup syntax does not work in `ansible.cfg` is correct for this use case; Galaxy server settings should be supplied directly or with `ANSIBLE_GALAXY_SERVER_<SERVER>_<KEY>` environment variables.

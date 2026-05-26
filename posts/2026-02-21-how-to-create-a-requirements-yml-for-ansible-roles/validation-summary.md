# Validation Summary: How to Create a requirements.yml for Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible Galaxy roles
- Ansible collections
- YAML requirements files
- Git-based role dependencies
- CI/CD dependency installation

## Sources Consulted
- Ansible Community Documentation: Galaxy User Guide - Installing roles from Galaxy and requirements.yml syntax: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: Installing collections with ansible-galaxy and requirements files: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: ansible-galaxy CLI reference: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The role specification example incorrectly showed a Galaxy server URL as a role `src`. For roles, the Galaxy server is selected with `--server` or ansible.cfg, while `src` identifies the role source. Updated the example to show a Galaxy role installed when ansible-galaxy is configured to use a specific server.
- The field reference overstated `name` as always required and described `src` as simply defaulting to `name`. Ansible role requirements can use `name` for Galaxy roles, or `src` as the source with `name` as an optional local install name. Updated the table to reflect that relationship.
- The combined roles-and-collections install section omitted Ansible's documented caveat that custom install paths cause collections to be skipped from a combined requirements file. Added a short note recommending separate role and collection installs when custom paths are needed.
- The validation command was described as a dry run, but `ansible-galaxy install` actually installs into the target path. Reworded it as installing into a temporary directory to verify parsing.

## Review Notes
- The installed environment did not include `ansible-galaxy`, so CLI behavior was verified against official Ansible documentation rather than local `--help` output.
- Collection version ranges, role version pinning with tags/branches/commits, separate `ansible-galaxy collection install -r requirements.yml`, and the warning against embedding credentials in requirements files align with current Ansible documentation.

# Validation Summary: How to Use Ansible with Polyrepo Structure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible roles
- Ansible collections
- ansible-galaxy CLI
- Ansible inventory
- Git and Git submodules
- GitHub Actions
- Molecule
- AWX / Ansible Automation Platform

## Sources Consulted
- Ansible Galaxy user guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible collection Galaxy metadata structure: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible using collections guide: https://docs.ansible.com/projects/ansible/6/user_guide/collections_using.html
- Ansible collection structure guide: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_structure.html
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The role requirements example used a single repository containing multiple roles and referenced role subdirectories with `git+https://...git//roles/nginx`. Ansible's documented role requirements format supports Galaxy role names or Git repositories as role sources, but not the pip-style `//subdirectory` syntax for roles. I changed the example to use one role per Git repository, with each repository root containing the role.
- The collection metadata used `license: proprietary`. Current Ansible collection metadata documentation says the `license` key accepts SPDX licenses and is mutually exclusive with `license_file`. I changed the example to `license_file: LICENSE` and added `LICENSE` to the collection tree for the proprietary internal collection case.

## Review Notes
The remaining examples are consistent with Ansible's documented requirements file format, collection version range syntax, collection publishing command options, collection role FQCN usage, inventory YAML structure, and GitHub Actions workflow syntax. The local workspace did not have `ansible-galaxy` installed, so CLI validation was performed against official Ansible documentation rather than local `--help` output.

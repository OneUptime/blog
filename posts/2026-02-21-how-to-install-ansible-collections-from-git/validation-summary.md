# Validation Summary: How to Install Ansible Collections from Git

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible collections
- Git repositories and Git refs
- requirements.yml
- GitHub Actions
- SSH and HTTPS Git authentication

## Sources Consulted
- Ansible Community Documentation: Installing collections, including Git repository installation and Git URL fragments: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Collection Galaxy metadata structure: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Community Documentation: Configuration settings for ANSIBLE_COLLECTIONS_PATH: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Git remote refs for ansible-collections/community.docker and ansible-collections/community.postgresql, checked with git ls-remote.

## Issues Found
- The subdirectory installation section mentioned a `--subdirectory` option and used `#subdirectory=docker`. Current Ansible documentation uses a URI fragment path such as `#/docker/`, placed before the optional comma-separated Git ref. Updated the command and explanation accordingly.
- The SSH command-line example used `git+git@github.com:...`. Current Ansible documentation says the `git+` prefix is not needed when using SSH authentication with the `git` user. Updated the command to use `git@github.com:...`.
- The private HTTPS token section presented embedded tokens without a security caveat. Current Ansible documentation warns that embedding credentials in Git URIs is not secure. Updated the wording to note the exposure risk and prefer avoiding token-bearing URLs where possible.
- The repository structure section said only `galaxy.yml` was required and that it only had to include namespace and name. Current Ansible documentation allows `galaxy.yml` or `MANIFEST.json`, and `galaxy.yml` requires namespace, name, version, readme, and authors. Updated the text, added `readme: README.md`, and marked README.md as required by that metadata field.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so CLI verification was performed against current official Ansible documentation rather than local `--help` output. The cited public collection branch and tag examples were checked with `git ls-remote` and existed at review time.

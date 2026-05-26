# Validation Summary: How to Install Collections from Git Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible collections
- Git repositories
- GitHub Actions
- SSH authentication
- HTTPS token authentication
- YAML requirements files

## Sources Consulted
- Ansible Community Documentation: Installing collections, including requirements.yml keys, Git repository installation, commit-ish versions, metadata requirements, and subdirectory fragments: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible CLI documentation for ansible-galaxy collection install options: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- GitHub repository metadata for ansible-collections/community.general tags, stable-8 branch, and HEAD commit: https://github.com/ansible-collections/community.general

## Issues Found
- The specific-commit command used a placeholder hash against the real community.general repository. Changed it to an actual current repository commit hash so the example demonstrates a valid commit pin.
- The post said subdirectory installs and repository requirements need `galaxy.yml`. Current Ansible documentation allows either `galaxy.yml` or `MANIFEST.json`, so both references were corrected.
- The caching section suggested `GIT_CLONE_DEPTH=1` for shallow clones. Ansible Galaxy documentation does not provide a documented shallow-clone option for Git-sourced collections, so the example was removed and the local mirror guidance retained.
- The summary said the `git+` prefix works with both HTTPS and SSH URLs. Current Ansible documentation says to use `git+` except for SCP-style SSH URLs using the `git` user, so the summary was clarified.
- A comment described community Galaxy collections as certified collections. Changed it to public collections to avoid confusing Galaxy-hosted community collections with certified Automation Hub content.

## Review Notes
- `ansible-galaxy` was not installed in the local environment, so command behavior was verified against current official Ansible documentation and Git repository metadata instead of local CLI execution.
- The HTTPS token examples are technically plausible, but embedding credentials in Git URLs is risky; the post now warns readers not to commit or log tokenized URLs.

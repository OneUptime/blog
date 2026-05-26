# Validation Summary: How to Install Ansible Collections from Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible Galaxy collections
- Ansible requirements.yml files
- ansible.cfg collection path configuration
- GitLab CI/CD
- YAML

## Sources Consulted
- Ansible Community Documentation: Installing collections with ansible-galaxy - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Downloading collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_downloading.html
- Ansible Community Documentation: Verifying collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_verifying.html
- Ansible Community Documentation: ansible-galaxy CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Core Configuration Settings: COLLECTIONS_PATHS and GALAXY_CACHE_DIR - https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible Galaxy API for community.docker versions - https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/community/docker/versions/
- Ansible Galaxy web page for community.docker - https://galaxy.ansible.com/ui/repo/published/community/docker/
- community.docker 3.8.0 galaxy.yml metadata - https://raw.githubusercontent.com/ansible-collections/community.docker/3.8.0/galaxy.yml
- Local check using ansible-galaxy from ansible-core 2.21.0 installed into a temporary pip target directory.

## Issues Found
- The example output for installing the latest `community.docker` collection showed `3.8.0`, which is no longer the current latest version on Galaxy. Updated the example to `5.2.1` and added a note that the exact version depends on when the command is run.
- The post said collection version ranges follow Python PEP 440 and included the `~=` compatible-release operator. Current `ansible-galaxy` documentation lists Ansible's supported range identifiers, and a local CLI check showed `~=` fails. Reworded the explanation and removed the unsupported example.
- The post recommended `--force` for upgrading installed collections. The CLI documents `--force` as overwriting an existing role or collection, while `--upgrade` is the option for upgrading installed collection artifacts. Updated the prose and command.
- The offline install command pointed `-r` at a generated requirements file in another directory. Ansible documents that relative paths in requirements files are resolved from the current working directory, so the offline install should be run from the downloaded tarball directory. Updated the command to `cd` into that directory first.
- The integrity section described a `--verify` flag and said verification checks Galaxy signatures by default. The correct interface is the `ansible-galaxy collection verify` subcommand; signature verification requires signature-related options such as `--keyring`. Updated the wording and command comments.
- The `ansible-galaxy collection verify --offline` command omitted the required collection names or requirements file. Updated it to verify collections listed in `requirements.yml` with `--offline`.

## Review Notes
- `ansible-galaxy` was not installed globally in the local environment, so a temporary `pip --target` install of `ansible-core` 2.21.0 was used for CLI help and command parsing checks.
- The pinned collection versions in the requirements file are examples and may become old over time, but they are syntactically valid and still available where checked.

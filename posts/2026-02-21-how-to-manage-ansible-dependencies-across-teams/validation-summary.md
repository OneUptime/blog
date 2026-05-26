# Validation Summary: How to Manage Ansible Dependencies Across Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections and roles
- Ansible requirements files
- Ansible Builder execution environments
- GitHub Actions
- Molecule
- Python
- YAML

## Sources Consulted
- Ansible Community Documentation: ansible-galaxy CLI, including `collection install`, `collection list`, `--upgrade`, `--no-deps`, `--force`, `-p`, `-r`, and `--format`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Installing collections and requirements file syntax, including version range identifiers and roles/collections in one `requirements.yml`: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Listing installed collections and using `ansible-galaxy collection list` for installed versions: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_listing.html
- Ansible Builder Documentation: execution environment definition schema version 3 and `dependencies.galaxy` inline requirements syntax: https://docs.ansible.com/projects/builder/en/stable/definition/

## Issues Found
- The dependency update workflow used `ansible-galaxy collection list "$name"` as if it returned the newest version available from Galaxy. Official documentation states that `collection list` lists installed collections, so the workflow would compare against local installed versions instead of available updates. I changed the example to install each collection into a temporary collections path, then list that path with `--format json` to read the latest resolved version.
- The workflow used `yq` but only installed `ansible-core`, so the example depended on an undeclared CLI tool. I changed the workflow to install `pyyaml` and parse `requirements.yml` with Python.
- The workflow always created `updates.md` with a header, so `[ -s updates.md ]` would be true even when no updates were found. I changed it to write `updates.md` only when updates exist.
- The workflow step was named "Create update PR if needed" while the command used `gh issue create`. I changed the step name to "Create update issue if needed".
- The compatibility testing workflow used `ansible-galaxy collection install -r requirements.yml` after showing a requirements file that contains both roles and collections. Official documentation says that subcommand installs only collections; I changed it to `ansible-galaxy install -r requirements.yml` so both roles and collections are processed.

## Review Notes
- Ansible does not provide a native lock-file workflow equivalent to package managers such as npm or Poetry. The post's custom generated `requirements.lock` example is technically valid as an audit artifact, but future revisions should clarify that `ansible-galaxy install -r` does not consume that lock file automatically.
- The sample dependency versions are illustrative. Teams should periodically revalidate them against their supported `ansible-core` version and collection compatibility notes.

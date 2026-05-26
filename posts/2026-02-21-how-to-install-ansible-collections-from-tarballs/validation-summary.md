# Validation Summary: How to Install Ansible Collections from Tarballs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-galaxy CLI
- Ansible collections
- Collection tarballs
- requirements.yml
- ansible.cfg
- Shell scripting

## Sources Consulted
- Ansible Community Documentation: Installing collections: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Downloading collections: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_downloading.html
- Ansible Community Documentation: ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Collection Galaxy metadata structure: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Core Documentation: Distributing collections: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_distributing.html
- community.docker 3.8.0 collection metadata: https://github.com/ansible-collections/community.docker/blob/3.8.0/galaxy.yml
- community.postgresql 3.2.0 collection metadata: https://github.com/ansible-collections/community.postgresql/blob/3.2.0/galaxy.yml
- ansible.netcommon 4.0.0 collection metadata: https://github.com/ansible-collections/ansible.netcommon/blob/4.0.0/galaxy.yml

## Issues Found
- The post said a built collection tarball contains `galaxy.yml`. Official Ansible documentation says `galaxy.yml` is source metadata and is excluded from collection tarballs by default. Updated the wording to say built artifacts contain collection content plus `MANIFEST.json` and `FILES.json`.
- The dependency examples incorrectly implied that `community.postgresql` 3.2.0 depends on `ansible.utils` and that `ansible.utils` depends on `ansible.netcommon`. Checked the collection metadata and changed the examples to use `community.docker` -> `community.library_inventory_filtering_v1` and `ansible.netcommon` -> `ansible.utils`.
- The local file server section showed a plain Python HTTP server configured as an Ansible Galaxy server in `ansible.cfg`. Ansible Galaxy server configuration expects a Galaxy-compatible API, not a static file server. Replaced the example with a `requirements.yml` that references direct tarball URLs using `type: url`, and clarified the limitation.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so CLI behavior was verified against the current official Ansible documentation instead of local `--help` output.

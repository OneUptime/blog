# Validation Summary: How to Lock Collection Versions in Ansible Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible collections
- YAML requirements files
- Bash
- Python
- GitHub Actions

## Sources Consulted
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: ansible-galaxy CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Verifying collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_verifying.html
- Ansible Galaxy published collection artifact metadata for `amazon.aws` 7.2.0 - https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/artifacts/amazon-aws-7.2.0.tar.gz
- Ansible Galaxy published collection artifact metadata for `community.docker` 3.7.0 - https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/artifacts/community-docker-3.7.0.tar.gz
- Ansible Galaxy versions API for `community.library_inventory_filtering_v1` - https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/community/library_inventory_filtering_v1/versions/

## Issues Found
- The post used `ansible-galaxy collection install amazon.aws:7.2.0 --dry-run`, but `--dry-run` is not a documented option for `collection install`. Replaced it with a temporary install and manifest inspection flow using the documented `-p` collection path option.
- The post claimed `amazon.aws` 7.2.0 could demonstrate a dependency on `ansible.utils`, but the published `amazon.aws` 7.2.0 `MANIFEST.json` has no collection dependencies. Replaced the example with `community.docker` 3.7.0, whose published metadata declares `community.library_inventory_filtering_v1 >=1.0.0`.
- The sample lock files included `ansible.utils` as a transitive dependency for the shown requirements. Replaced it with `community.library_inventory_filtering_v1` 1.1.5, which is a valid resolved dependency for `community.docker` 3.7.0 as of the reviewed Galaxy metadata.
- The checksum script only hashed `MANIFEST.json`, which would not detect local modification of installed collection files. Replaced it with the supported `ansible-galaxy collection verify -r requirements.lock.yml -p ./collections` command, which verifies installed collection contents against Galaxy checksums.

## Review Notes
Local `ansible-galaxy` was not installed in the review environment, so CLI option validation was performed against the current official Ansible documentation and Galaxy collection artifact metadata. The freshness-check script embeds command output into an inline Python string; it is suitable for the simple generated YAML shown, but a future improvement would pass the YAML through stdin or a temporary file to avoid shell quoting edge cases.

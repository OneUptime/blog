# Validation Summary: How to Publish Ansible Collections to Galaxy

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Ansible collections
- Ansible Galaxy
- ansible-galaxy CLI
- galaxy.yml collection metadata
- ansible.cfg Galaxy server configuration
- GitHub Actions
- Red Hat Automation Hub

## Sources Consulted
- Ansible Community Documentation: Distributing collections - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_distributing.html
- Ansible Community Documentation: ansible-galaxy CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Community Documentation: Configuration settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Galaxy NG documentation: Collections - https://ansible.readthedocs.io/projects/galaxy-ng/en/latest/usage_guide/collections.html

## Issues Found
- Updated namespace guidance. The post said a GitHub username is automatically available as a namespace and organization namespaces require Galaxy admin approval. Current Ansible documentation says a Galaxy username is usually also a namespace if it follows namespace rules, and namespaces cannot contain hyphens. The text now reflects that and avoids the unsupported admin-approval claim.
- Corrected API token environment usage. The post implied `ANSIBLE_GALAXY_TOKEN` would be read automatically for collection publishing. Current collection publishing documentation supports `--token` / `--api-key` or tokens in Galaxy server configuration. The example now stores the token in an environment variable and passes it explicitly with `--api-key`.
- Corrected the metadata validation example. The required metadata check now includes `readme` and checks for either `license` or `license_file`, matching the documented `galaxy.yml` metadata expectations more closely.
- Corrected the import-process file description. Built collection artifacts contain manifest files such as `MANIFEST.json` and `FILES.json`; `galaxy.yml` is excluded from the built artifact by default. The post now says Galaxy checks the manifest files.
- Corrected version install syntax. The example for installing a specific version now uses the documented version range form `:==1.0.1`.
- Corrected upgrade syntax. The post used `--force` for upgrading to the latest collection version. Current Ansible documentation uses `--upgrade`; the command now uses `--upgrade`.
- Clarified Automation Hub publishing. Red Hat Automation Hub publishing is not open to every Galaxy publisher; the post now says this applies when the publisher is certified or otherwise authorized.

## Review Notes
The GitHub Actions example is structurally plausible, but production workflows may also need explicit token permissions for GitHub release creation depending on repository settings. The post remains version-neutral and uses current Ansible documentation as of 2026-05-26.

# Validation Summary: How to Build Ansible Collections for Galaxy Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible collections
- Ansible Galaxy
- ansible-galaxy CLI
- ansible-test
- galaxy.yml collection metadata
- meta/runtime.yml runtime metadata
- GitHub Actions CI/CD
- Python Ansible modules
- GNU Make

## Sources Consulted
- Ansible collection Galaxy metadata structure: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible collection requirements, including meta/runtime.yml: https://docs.ansible.com/projects/ansible/latest/community/collection_contributors/collection_requirements.html
- Ansible module/plugin lifecycle and plugin_routing redirects: https://docs.ansible.com/projects/ansible/latest/dev_guide/module_lifecycle.html
- Ansible sanity tests documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/index.html
- ansible-core release and maintenance matrix: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- ansible-galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- ansible-core 2.20 porting guide: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_core_2.20.html

## Issues Found
- The `galaxy.yml` example specified both `license` and `license_file`. Official Ansible metadata documentation says these keys are mutually exclusive, so `license_file: LICENSE` was removed while keeping the SPDX `license` value.
- The `meta/runtime.yml` example and CI matrix targeted ansible-core 2.14 through 2.16, which are end-of-life by the 2026 support matrix. Updated `requires_ansible` to `>=2.19.0` and the CI matrix to ansible-core 2.19 and 2.20.
- The GitHub Actions example used Python 3.11 while testing ansible-core 2.20. The ansible-core 2.20 porting guide and support matrix require Python 3.12+ on the control node, so the workflow was updated to Python 3.12.
- The sanity ignore filename was tied to ansible-core 2.14. It was updated to `ignore-2.19.txt` to match the revised minimum supported ansible-core version.

## Review Notes
The local workspace does not have `ansible-galaxy` or `ansible-test` installed, so CLI verification was performed against official documentation rather than local command execution. The unit test shown in the article is intentionally minimal and verifies only that `main` is callable; future improvements could show a fuller Ansible module unit test that asserts `exit_json` output.

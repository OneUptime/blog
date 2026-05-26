# Validation Summary: How to Upload Collections to Ansible Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible collections
- Ansible Galaxy
- `ansible-galaxy` CLI
- `galaxy.yml` collection metadata
- `meta/runtime.yml` collection runtime metadata
- `ansible-test`
- GitHub Actions

## Sources Consulted
- Ansible Community Documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Community Documentation: Collection structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_structure.html
- Ansible Community Documentation: Creating collections - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_creating.html
- Ansible Core Documentation: Distributing collections - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_distributing.html
- Ansible Community Documentation: `ansible-galaxy` CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Testing Ansible and Collections - https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_running_locally.html
- Ansible Community Documentation: Sanity Tests - https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_sanity.html
- Ansible Community Documentation: The lifecycle of an Ansible module or plugin - https://docs.ansible.com/projects/ansible/latest/dev_guide/module_lifecycle.html

## Issues Found
- The `galaxy.yml` example used both `license` and `license_file`. Official collection metadata marks these keys as mutually exclusive, so I removed `license_file` from the example and added a note to use one or the other.
- The prerequisite wording said a Galaxy namespace matches a GitHub username or organization. Official docs say a Galaxy username is usually also a namespace and additional namespaces can be created, so I changed the wording to avoid overstating the GitHub relationship.
- The example used `docs/myapp_config_module.rst` for a generic collection docs file. Current collection structure docs state that files directly under `/docs` should use `.md`, so I changed the example to `.md`.
- The environment-variable token example used `ANSIBLE_GALAXY_TOKEN`, which is not the documented server token variable format. I changed it to `ANSIBLE_GALAXY_SERVER_GALAXY_TOKEN` for the configured `galaxy` server entry.
- The verification comments described `ansible-galaxy collection install` as a search and `collection list` as checking info. I updated the comments to match what the commands actually do.
- The `ansible-test` example ran from `my_namespace/my_collection/`. Official testing docs require the path to end with `ansible_collections/<namespace>/<collection>`, so I changed the example to `~/ansible_collections/my_namespace/my_collection/`.

## Review Notes
The GitHub Actions examples assume the repository root is the collection root for the release workflow, while the CI workflow checks out into an `ansible_collections` path for `ansible-test`. That is valid, but maintainers with a different repository layout may need to set `working-directory` for build and publish steps.

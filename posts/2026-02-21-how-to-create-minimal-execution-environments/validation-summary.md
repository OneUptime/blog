# Validation Summary: How to Create Minimal Execution Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible Execution Environments
- Ansible Builder 3.x
- Ansible Runner
- Ansible Galaxy collections
- Python package dependencies
- bindep system dependencies
- Podman container image commands
- Container image optimization

## Sources Consulted
- Ansible Builder execution environment definition: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage: https://docs.ansible.com/projects/builder/en/stable/usage/
- Ansible Builder collection-level dependencies: https://docs.ansible.com/projects/builder/en/latest/collection_metadata/
- Ansible getting started with Execution Environments: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/build_execution_environment.html
- Ansible Core releases and maintenance: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/release_and_maintenance.html
- Ansible Runner container interface documentation: https://docs.ansible.com/projects/runner/en/2.3.4/container/
- Ansible collection installation requirements format: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Podman pull reference: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman images reference: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman history reference: https://docs.podman.io/en/latest/markdown/podman-history.1.html

## Issues Found
- The first `execution-environment.yml` example pinned `ansible-core>=2.15.0,<2.17.0`. Ansible Core 2.15 and 2.16 are unmaintained according to the current Ansible Core support matrix, so this was changed to `package_pip: ansible-core`, matching the Ansible Builder v3 documentation's current-compatible package example.
- The text said to use the "minimal runner image" while the snippet used `quay.io/ansible/ansible-runner:latest`, not a distinct minimal tag. The wording was changed to "lightweight runner image," which matches Ansible Runner documentation describing the reference image as lightweight.

## Review Notes
The examples use `latest` image tags and some unpinned package versions, which is acceptable for a general guide but less reproducible for production builds. In production, readers should pin base image tags or digests and choose `ansible-core`, collection, and Python package versions that match their supported platform and test matrix.

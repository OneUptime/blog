# Validation Summary: How to Use Molecule with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible and ansible-core
- Molecule
- molecule-plugins Docker driver
- ansible-lint and yamllint
- GitHub Actions workflows, matrix builds, caching, artifacts, and secrets
- Docker CLI and Docker image caching

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible release and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/setup-python documentation: https://github.com/actions/setup-python
- GitHub-hosted runners documentation: https://docs.github.com/actions/reference/runners/github-hosted-runners
- GitHub runner images documentation: https://github.com/actions/runner-images
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- PyPI Molecule package metadata: https://pypi.org/project/molecule/
- PyPI molecule-plugins package metadata: https://pypi.org/project/molecule-plugins/
- PyPI ansible-lint package metadata: https://pypi.org/project/ansible-lint/

## Issues Found
- The examples used Python 3.11 with current unpinned `ansible-core` installs. Current `ansible-core` 2.20 requires Python 3.12 through 3.14 on the control node, so the workflow examples now use Python 3.12.
- The pinned development requirements referenced old Ansible and Molecule ranges (`ansible-core>=2.15,<2.17`, `molecule>=6.0,<7.0`, broad `ansible-lint>=6.0`). These were updated to current compatible ranges for May 26, 2026.
- The Ansible-version matrix tested end-of-life versions 2.15, 2.16, and 2.17. It now tests 2.19 and 2.20, matching current supported versions and Python 3.12 compatibility.
- The production workflow labeled Ansible 2.17 as latest and used 2.16 as the base version. It now uses 2.19 as the base and 2.20 as the latest-version include.
- The platform-matrix section implied that the matrix alone changes Molecule platforms. The text now clarifies that matching Molecule platform names must exist for the `--limit` approach to work.
- The Docker registry login example used `docker login -p`. It now uses `--password-stdin`, matching Docker's recommended noninteractive login method and avoiding command-line password exposure.

## Review Notes
- The Molecule `molecule test`, `--scenario-name`, and `-- --limit ...` command forms are valid according to the Molecule CLI documentation.
- The GitHub Actions matrix, `fail-fast: false`, setup-python pip cache, scheduled workflow, artifact upload, secrets usage, and status badge examples are technically valid.
- `actions/checkout@v4`, `actions/setup-python@v5`, `actions/cache@v4`, and `actions/upload-artifact@v4` remain usable, although newer major versions exist for some official actions.

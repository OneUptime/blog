# Validation Summary: How to Use Custom Python Packages in Execution Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Execution Environments
- Ansible Builder 3.x
- Python packaging and pip requirements files
- bindep system dependencies
- Podman container commands
- Ansible filter plugins
- netaddr

## Sources Consulted
- Ansible Builder execution environment definition: https://docs.ansible.com/projects/builder/en/stable/definition/
- Ansible Builder CLI usage: https://docs.ansible.com/projects/builder/en/stable/usage/
- Ansible Builder installation and base image requirements: https://docs.ansible.com/projects/builder/en/latest/installation.html
- Ansible Builder passing secrets scenario: https://docs.ansible.com/projects/builder/en/stable/scenario_guides/scenario_secret_passing/
- Ansible Builder validating installed Python dependencies: https://docs.ansible.com/projects/builder/en/stable/scenario_guides/scenario_pip_check/
- Ansible Builder collection-level bindep dependency behavior: https://docs.ansible.com/projects/builder/en/latest/collection_metadata/
- pip requirements file format: https://pip.pypa.io/en/stable/reference/requirements-file-format/
- pip VCS support: https://pip.pypa.io/en/stable/topics/vcs-support/
- pip check: https://pip.pypa.io/en/stable/cli/pip_check.html
- Ansible filter plugins: https://docs.ansible.com/ansible/latest/plugins/filter.html
- cryptography installation requirements: https://cryptography.io/en/latest/installation/
- psycopg2 installation requirements: https://www.psycopg.org/docs/install.html
- lxml installation requirements: https://lxml.de/installation.html

## Issues Found
- The EE definition examples used the older `quay.io/ansible/ansible-runner:latest` base image pattern. Updated the examples to use `docker.io/redhat/ubi9:latest` with `ansible_core` and `ansible_runner` declared in `dependencies`, matching current Ansible Builder 3.x examples.
- The bindep example only marked `gcc` and `make` with the `compile` profile while describing all listed development packages as build-only. Added `compile` to the development libraries and added `rust`/`cargo` for source builds of `cryptography`.
- The `psycopg2-binary` explanation said the PostgreSQL client library was statically linked. Changed this to say the package bundles its own client library, matching the psycopg2 documentation.
- The private Git SSH example copied a private key into the build context and then removed it from the final image, which does not prevent the key from being present in build context/layers. Replaced it with a build-secret based example using `--extra-build-cli-args`.
- The private Git SSH URL was shown in `requirements.txt`, but the secret-mounted install needs to run in the same build step that uses the key. Removed the private SSH URL from the requirements snippet and installed it in `append_final`.
- The local package example referenced `/output/packages`, but `additional_build_files` places files under `_build/<dest>` in the build context. Updated the example to `COPY _build/packages /tmp/packages` and install from there in the final stage.
- The filter plugin used `list(network.iter_hosts())` to get the first host and used `IPNetwork(...).size - 2` for usable host count. Replaced these with iterator-based `next()` and `iter_hosts()` counting so the example matches netaddr's host iteration behavior more closely.
- The verification commands called `pip` directly. Updated them to `python3 -m pip`, which is the recommended form in Ansible Builder's pip-check guidance to ensure the intended interpreter is used.

## Review Notes
The examples intentionally use broad version ranges such as `>=`; for production EEs, pinning exact versions or using constraints files would improve reproducibility. The private Git example requires container-runtime support for build secrets and assumes `git` is installed in the final image for that custom install step.

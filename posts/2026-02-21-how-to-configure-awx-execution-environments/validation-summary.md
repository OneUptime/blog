# Validation Summary: How to Configure AWX Execution Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- Ansible execution environments
- ansible-builder
- Ansible Galaxy collections
- bindep
- Docker and Podman
- GitLab CI
- Container registries

## Sources Consulted
- Ansible Builder installation documentation: https://docs.ansible.com/projects/builder/en/latest/installation/
- Ansible Builder execution environment definition documentation: https://docs.ansible.com/projects/builder/en/latest/definition/
- Ansible Builder CLI usage documentation: https://docs.ansible.com/projects/builder/en/latest/usage/
- Ansible Builder collection-level dependency documentation: https://docs.ansible.com/projects/builder/en/latest/collection_metadata/
- AWX execution environments user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/execution_environments.html
- awx.awx execution_environment module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/execution_environment_module.html
- bindep documentation: https://docs.opendev.org/opendev/bindep/latest/readme.html

## Issues Found
- The `execution-environment.yml` example used `quay.io/ansible/ansible-runner:latest` as the base image without explicitly declaring `ansible_core` and `ansible_runner`. Updated the example to use the documented RPM-based `docker.io/redhat/ubi9:latest` base image and explicitly install `ansible-core` and `ansible-runner` through the v3 `dependencies` keys.
- The example included a `COPY --from=quay.io/ansible/ansible-runner:latest /usr/bin/ssh /usr/bin/ssh` build step, which was unnecessary and brittle. Removed it and added `openssh-clients [platform:rpm]` to `bindep.txt` instead.
- The `bindep.txt` example used `platform:centos-8` and `platform:centos-9` selectors. Updated these to the documented `platform:rpm` selector for RPM-based execution environment builds.
- The GitLab CI example used the `quay.io/ansible/ansible-builder:latest` image while also relying on Docker-in-Docker and `docker push`. Updated the job to use a Docker CLI image, install Python and ansible-builder in a virtual environment, disable Docker TLS for the DinD service, and keep the Docker-based `ansible-builder build` workflow consistent.

## Review Notes
The AWX `pull` values (`always`, `missing`, and `never`), AWX execution environment API field names, job template `execution_environment` assignment, `ansible-builder build --container-runtime docker`, `--verbosity`, and `--prune-images` usage were consistent with the official documentation. `ansible-builder` was not installed in the local environment, so CLI behavior was verified against official documentation and the edited YAML/JSON snippets were parsed locally.

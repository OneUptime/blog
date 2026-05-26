# Validation Summary: How to Use Ansible in Docker-Based CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible Vault
- ansible-lint
- Docker
- Docker Compose
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- SSH

## Sources Consulted
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible releases and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible Galaxy collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/index.html
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab Docker executor image documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab deprecated CI/CD keywords documentation: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins credentials binding documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- PyPI package indexes for current Ansible and ansible-lint package versions: https://pypi.org/project/ansible/ and https://pypi.org/project/ansible-lint/

## Issues Found
- The Dockerfiles and CI examples pinned `ansible==8.7.0`, but the official Ansible maintenance table marks Ansible 8.x as unmaintained. Updated the examples to `ansible==13.7.0` and the corresponding image tags to `13.7.0`.
- The Dockerfiles used `python:3.11-slim`, but current Ansible 13.x depends on ansible-core 2.20, whose control-node Python support starts at Python 3.12. Updated the base image to `python:3.12-slim`.
- The Dockerfile pinned `ansible-lint==6.22.0`, which is outdated for a current Ansible guide. Updated it to `ansible-lint==26.4.0`.
- The GitLab CI example used a globally defined `image`, which GitLab now documents as deprecated. Moved the image under `default:`.
- The networking section said CI/CD containers usually work because containers use host networking. Docker documentation says containers without `--network` use the default bridge network, which can reach external hosts through the Docker host. Corrected the explanation.
- The host-networking `docker run` example was fenced as YAML even though it is a shell command. Changed the code fence to `bash`.

## Review Notes
- The examples intentionally disable SSH host key checking for CI convenience. That is technically valid, but production pipelines should prefer managed `known_hosts` entries when possible.
- The `ansible-galaxy collection install` examples install unpinned collection versions. For stricter reproducibility across image rebuilds, future revisions should pin collection versions in `requirements.yml`.

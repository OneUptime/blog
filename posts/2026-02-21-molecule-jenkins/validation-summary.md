# Validation Summary: How to Use Molecule with Jenkins

## Status
validated

## Post Type
Tutorial / CI configuration guide

## Technologies Covered
- Jenkins Declarative Pipeline
- Jenkins Scripted Pipeline
- Jenkins Docker Pipeline agents
- Jenkins Credentials Binding
- Ansible Molecule
- Molecule Docker driver
- Ansible Vault
- Docker socket mounting and Docker-in-Docker
- ansible-lint
- yamllint
- pytest-testinfra and JUnit XML reporting

## Sources Consulted
- Jenkins Pipeline Syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Using Docker with Pipeline: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Docker Pipeline plugin: https://plugins.jenkins.io/docker-workflow
- Jenkins Credentials Binding Plugin: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- pytest reference for JUnit XML output: https://docs.pytest.org/en/latest/reference/reference.html
- Docker run reference for `--group-add`, `--user`, and privileged containers: https://docs.docker.com/engine/containers/run/
- Docker daemon socket reference: https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The introduction said the guide covered freestyle jobs, but the post covers declarative and scripted pipelines. Changed the wording to "declarative and scripted pipelines."
- The prerequisites referred to the generic Docker plugin, but Docker agents in Jenkins Pipeline use Docker Pipeline support. Changed this to "Docker Pipeline plugin for Jenkins."
- The first declarative pipeline used `yamllint .` without installing `yamllint`. Added `yamllint` to the `pip install` command.
- The first declarative pipeline passed `--group-add docker` to `python:3.11-slim`, but that image does not define a `docker` group, so Docker fails before starting the container. Removed the invalid group argument and clarified that the image runs as root by default.
- The custom non-root Docker agent image added the Jenkins user to the image's `docker` group but did not account for the host Docker socket group ID. Added a `DOCKER_GID` build argument and made the Docker group match it.
- The parallel pipeline explanation said stages run "completely independently," but socket mounting means they still share the host Docker daemon. Clarified the isolation boundary.
- The Ansible Vault example removed `.vault-password` only after a successful `molecule test`. Added a shell `trap` so the temporary vault password file is removed when the shell exits.
- The scripted pipeline assigned `scenarios` without declaring it before use outside the discovery stage. Added `def scenarios = []` before the `node` block.

## Review Notes
- The Molecule `test --scenario-name` usage matches the current command line reference.
- The Testinfra verifier configuration uses Molecule's documented verifier `options` pass-through to pytest, and `junit-xml` maps to pytest's JUnit XML output option.
- Socket mounting is technically valid but gives the container access to the host Docker daemon. The post now states the shared-daemon caveat, but production Jenkins installations may prefer more isolated agents depending on their security model.

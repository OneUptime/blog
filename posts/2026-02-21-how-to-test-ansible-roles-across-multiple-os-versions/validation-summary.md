# Validation Summary: How to Test Ansible Roles Across Multiple OS Versions

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible roles, facts, modules, and role metadata
- Molecule role testing
- Molecule Docker driver
- Docker containers and cgroup namespace options
- GitHub Actions matrix builds
- GitLab CI matrix builds and Docker-in-Docker
- Linux distribution support lifecycles

## Sources Consulted
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible first_found lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible check mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule command line documentation: https://docs.ansible.com/projects/molecule/usage/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab CI services documentation: https://docs.gitlab.com/ci/services/
- Ubuntu releases documentation: https://www.releases.ubuntu.com/releases/
- Ubuntu 20.04 ESM announcement: https://lists.ubuntu.com/archives/ubuntu-announce/2025-April/000310.html
- Debian Bullseye LTS documentation: https://wiki.debian.org/LTS/Bullseye
- Debian Bookworm release information: https://www.debian.org/releases/bookworm/
- Red Hat Enterprise Linux lifecycle documentation: https://access.redhat.com/support/policy/updates/errata

## Issues Found
- The GitLab CI Docker-in-Docker example used `DOCKER_HOST: tcp://docker:2375` without disabling TLS. GitLab's documented no-TLS Docker-in-Docker configuration also sets `DOCKER_TLS_CERTDIR: ""`, so I added that variable.
- The Ubuntu 20.04 lifecycle notes were stale for a 2026 review. I changed the Molecule EOL example from a past "will be removed 2025-04" comment to an ESM-only support note, and updated the role metadata comment to say standard support ended in May 2025 with ESM available until April 2030.
- The Debian 11 lifecycle comment said June 2026. Current Debian LTS documentation lists Bullseye LTS through August 2026, so I updated the comment.

## Review Notes
- The Ansible and Molecule snippets use valid current syntax. The `molecule test -- --limit ...` pattern is consistent with Molecule's documented support for passing extra arguments to `ansible-playbook`.
- The verification example computes `expected_php_pkg` but does not use it later. This is not technically incorrect, but a future revision could either verify the PHP package or omit that fact.
- The Docker images use `:latest`; the post correctly warns later that pinned tags are preferable for reproducible tests.

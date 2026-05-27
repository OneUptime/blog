# Validation Summary: How to Run Ansible Integration Tests in CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Molecule
- Molecule Docker driver
- pytest-testinfra
- Docker containers
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule continuous integration documentation: https://docs.ansible.com/projects/molecule/ci/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- pytest-testinfra module documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitHub Actions Python workflow documentation: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-python
- GitHub Actions matrix strategy documentation: https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs
- Ansible import_playbook documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html

## Issues Found
- The install command used the obsolete `molecule[docker]` extra. Current Molecule packaging provides Docker support through `molecule-plugins[docker]`, so the installation examples were updated.
- The Docker platform examples used base `ubuntu:22.04` and `rockylinux:9` images with systemd commands. Those base images do not provide a working systemd test target as written, and `ubuntu:22.04` also lacks Python for Ansible. The examples now use systemd-capable Ansible test images.
- The described default `molecule test` sequence included `lint`, which is not part of the current documented default sequence. The sequence was corrected.
- The GitLab CI Docker-in-Docker example set `DOCKER_HOST` to the non-TLS port but did not disable Docker TLS certificate generation. Added `DOCKER_TLS_CERTDIR: ""` to match GitLab's documented non-TLS DinD configuration.
- The idempotency configuration snippet did not actually configure idempotency. It now shows an explicit `scenario.test_sequence` containing the `idempotence` action.
- The playbook testing example used `include_tasks` to run a full playbook. Ansible playbooks must be imported at the top level with `import_playbook`, so the example was corrected.

## Review Notes
- The Testinfra examples use valid host modules for package, service, file, and socket checks. The exact file paths, service names, and package names still depend on how the example `nginx_setup` role manages distro-specific Nginx configuration.

# Validation Summary: How to Use Molecule with GitLab CI

## Status
validated

## Post Type
Tutorial / CI configuration guide

## Technologies Covered
- Ansible
- Ansible Molecule
- Molecule Docker/Testinfra verifier configuration
- GitLab CI/CD
- GitLab Runner Docker executor and Docker-in-Docker
- Docker
- pytest JUnit XML reporting
- Ansible Vault

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- Ansible Molecule command-line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Docker container examples: https://docs.ansible.com/projects/molecule/examples/docker/
- GitLab Runner Docker executor documentation: https://docs.gitlab.com/runner/executors/docker/
- GitLab CI/CD YAML reference: https://docs.gitlab.com/ci/yaml/
- GitLab CI/CD job control and `parallel:matrix` documentation: https://docs.gitlab.com/ci/jobs/job_control/
- GitLab CI/CD artifact reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- Ansible Vault encrypted content documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible collections installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- pytest JUnit XML option documentation: https://docs.pytest.org/en/stable/reference.html

## Issues Found
- The introduction said GitLab CI uses Docker runners by default and that Molecule's Docker driver works perfectly inside those runners. GitLab runners can use several executors, and Docker-in-Docker requires privileged runner configuration. Updated the wording to refer to runners using the Docker executor and properly configured Docker-in-Docker.
- The basic pipeline said it used an official Molecule Docker image, but the snippet used a Docker image and installed Molecule during the job. Updated the wording to match the actual configuration.
- The basic pipeline used `docker:24-dind` as the job image and mixed TLS Docker-in-Docker settings without documenting the required certificate volume. Updated the examples to use `docker:24-cli` for the job, `docker:24-dind` as the service, `--tls=false`, `DOCKER_HOST=tcp://docker:2375`, and `DOCKER_TLS_CERTDIR=""`.
- Several later snippets used TLS Docker-in-Docker variables while other examples used non-TLS settings. Normalized the snippets to the same documented non-TLS Docker-in-Docker configuration.
- The Vault snippet used `echo` to write the vault password file. Replaced it with `printf` and added `chmod 600` for a more predictable password file.
- The JUnit section implied Molecule itself creates JUnit reports. Updated the wording to clarify that the verifier must generate the XML report, and retained the Testinfra/pytest configuration for that purpose.
- The troubleshooting section recommended `MOLECULE_DESTROY_TIMEOUT` and `MOLECULE_CONVERGE_TIMEOUT`, which are not documented Molecule settings. Replaced that advice with GitLab job timeout and Ansible timeout guidance.
- The complete example preserved `molecule-output.log` as an artifact but did not create it. Updated the command to pipe Molecule output through `tee`.

## Review Notes
The examples assume a GitLab runner configured for privileged Docker-in-Docker. The non-TLS Docker-in-Docker pattern is simple for CI examples, but teams with stricter runner security requirements should evaluate rootless Docker-in-Docker or a TLS-enabled DinD setup with the required certificate volume.

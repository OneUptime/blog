# Validation Summary: How to Use Execution Environments in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / CI/CD implementation guide

## Technologies Covered
- Ansible Execution Environments
- ansible-navigator
- ansible-builder
- ansible-playbook and Ansible Vault
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Docker and Podman container runtimes

## Sources Consulted
- Ansible Navigator documentation: https://docs.ansible.com/projects/navigator/
- Ansible Navigator settings reference: https://docs.ansible.com/projects/navigator/settings/
- Ansible Navigator FAQ: https://ansible.readthedocs.io/projects/navigator/faq/
- Ansible Builder CLI usage: https://ansible.readthedocs.io/projects/builder/en/stable/usage.html
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html
- GitHub Actions job container documentation: https://docs.github.com/en/actions/writing-workflows/choosing-where-your-workflow-runs/running-jobs-in-a-container
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions dependency caching reference: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitLab CI/CD Docker image documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab CI/CD rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- Jenkins Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The GitHub Actions example that runs directly inside the EE container set `ANSIBLE_VAULT_PASSWORD`, but Ansible does not use that environment variable directly as a raw Vault password. I changed the snippet to write the secret to `.vault_pass`, pass it with `--vault-password-file`, and clean it up after the run.
- The secret-injection example set `ANSIBLE_VAULT_PASSWORD_FILE` to `/tmp/vault_pass` without creating or mounting that file into the execution environment. I changed the snippet to prepare a runtime secrets directory, mount it read-only into the EE, pass `/secrets/vault_pass` with `--vault-password-file`, and clean up the temporary directory.
- The GitHub Actions Vault password file examples created plaintext Vault password files without setting restrictive file permissions. I added `chmod 600` after creating those files, matching Ansible's Vault guidance to keep password files protected.
- The caching section called the GitHub Actions example "Docker layer caching", but the snippet saves and restores a Docker image tarball with `actions/cache`. I changed the wording to "cached image archive" to accurately describe the implementation.

## Review Notes
- The examples assume the execution environment image includes the command-line tools used inside the job, such as `ansible-playbook`, `ansible-lint`, `ssh`, and `ssh-keyscan`.
- GitHub Actions job containers use `sh` as the default shell for `run` steps unless configured otherwise; the snippets are compatible with `sh`.
- The placeholder image name `quay.io/myorg/ansible-ee:2.1.0` is syntactically valid but must be replaced with a real published execution environment image.

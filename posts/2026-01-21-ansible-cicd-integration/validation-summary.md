# Validation Summary: How to Integrate Ansible with CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- Molecule
- GitHub Actions
- GitLab CI/CD
- Jenkins Declarative Pipeline
- HashiCorp Vault GitHub Action
- SSH host key management
- Docker-in-Docker for CI testing

## Sources Consulted
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible connection and host key checking documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions jobs and `needs` documentation: https://docs.github.com/actions/using-jobs/using-jobs-in-a-workflow
- GitHub Actions secrets documentation: https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab project-level CI/CD variables API documentation: https://docs.gitlab.com/api/project_level_variables/
- Jenkins Pipeline Docker documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Pipeline credentials documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins Credentials Binding Plugin documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- HashiCorp Vault GitHub Actions documentation: https://developer.hashicorp.com/vault/docs/platform/github-actions
- HashiCorp `vault-action` documentation: https://github.com/hashicorp/vault-action
- `ssh-keyscan` manual page: https://man7.org/linux/man-pages/man1/ssh-keyscan.1.html

## Issues Found
- The GitHub Actions production deployment job depended on `deploy-staging`, but `deploy-staging` was skipped for manual production runs. Updated the staging job condition so a production dispatch runs staging first, allowing the dependent production job to proceed.
- The GitHub production SSH setup did not populate `known_hosts`, which can fail in noninteractive Ansible runs because host key checking is enabled by default. Added `ssh-keyscan` for the production host and quoted the staging host scan.
- The GitLab and Jenkins deployment examples did not populate `known_hosts`. Added host variables and `ssh-keyscan` commands for staging and production deployments.
- The GitLab Molecule Docker-in-Docker job used `DOCKER_HOST=tcp://docker:2375` without disabling Docker TLS certificate directory. Added `DOCKER_TLS_CERTDIR: ""` to match the non-TLS DinD endpoint.
- The GitLab and Jenkins examples relied on SSH tooling inside Python images without installing `openssh-client`. Added installation steps where those images configure SSH keys or run Ansible over SSH.
- The Jenkins example used a generic file credential binding for an SSH private key. Replaced it with `sshUserPrivateKey`, which is the Jenkins Credentials Binding Plugin binding intended for SSH private key credentials.
- The HashiCorp Vault GitHub Actions snippet used JWT auth without the required GitHub OIDC token permission. Added `contents: read` and `id-token: write`, and wrapped the snippet in a valid `steps` block. Updated the action reference to the current major version.

## Review Notes
- GitLab Docker-in-Docker still requires a runner configured to allow privileged Docker service containers.
- The Jenkins `slackSend` post actions require the appropriate Slack plugin and Jenkins configuration.
- Placeholder host values such as `staging.example.com` and `example.com` should be replaced with real deployment targets.

# Validation Summary: How to Run Ansible Playbooks in GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitHub Actions workflows
- GitHub Actions environments, secrets, and cache
- Ansible and ansible-playbook
- Ansible Galaxy collections
- Ansible Vault
- SSH for deployment targets
- Slack GitHub Action notifications

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Actions encrypted secrets: https://docs.github.com/en/actions/reference/encrypted-secrets
- actions/checkout official action: https://github.com/actions/checkout
- actions/setup-python official action: https://github.com/actions/setup-python
- actions/cache official action: https://github.com/actions/cache
- Ansible collection installation docs: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- ansible-playbook CLI docs: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible PyPI release metadata: https://pypi.org/project/ansible/
- Slack GitHub Action docs and action metadata: https://github.com/slackapi/slack-github-action and https://raw.githubusercontent.com/slackapi/slack-github-action/v3.0.3/action.yml

## Issues Found
- The workflow examples pinned `ansible==8.7.0`, which is a 2023 release and outdated for a 2026 production workflow. Updated the examples and production tip to pin `ansible==13.7.0`, the current stable Ansible package available on PyPI at review time.
- The examples used Python 3.11 with the Ansible package pin. Current Ansible package metadata requires Python >=3.12, so the setup-python examples now use Python 3.12.
- The GitHub-owned action examples used older action tags (`actions/checkout@v4` and `actions/setup-python@v5`). Updated them to the current `@v6` tags.
- The staged deployment example implied that `environment: production` always requires manual approval. GitHub environments require manual approval only when required reviewers are configured, so the comment was clarified.
- The Slack notification example used the older `slackapi/slack-github-action@v1.25.0` interface with `SLACK_WEBHOOK_URL` in `env`. Updated it to `slackapi/slack-github-action@v3.0.3` with the current `webhook` and `webhook-type: incoming-webhook` inputs.

## Review Notes
- The Ansible commands and options shown, including `ansible-galaxy collection install -r`, `ansible-playbook -i`, `--vault-password-file`, and `--syntax-check`, match the official Ansible documentation.
- The examples still disable Ansible host key checking in several workflow steps. That is technically supported, but production workflows should prefer managing known hosts instead of disabling host key checking.

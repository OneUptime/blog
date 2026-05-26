# Validation Summary: How to Use Ansible with GitOps Workflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- ansible-lint
- GitHub Actions
- GitHub CLI
- GitOps workflows
- SSH-based deployment automation

## Sources Consulted
- Ansible playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible retry/until documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions concurrency documentation: https://docs.github.com/actions/using-jobs/using-concurrency
- GitHub Actions events documentation: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
- GitHub CLI issue create help: `gh issue create --help`
- OpenGitOps principles: https://opengitops.dev/

## Issues Found
- The repository tree omitted `playbooks/verify.yml`, but the staging and production workflow examples both run `playbooks/verify.yml`. Added `verify.yml` to the example tree.
- The repository tree omitted `.github/workflows/drift-check.yml`, but the post later includes that workflow. Added it to the example tree.
- The drift detection workflow used `--vault-password-file .vault_pass` but never created `.vault_pass`. Added a vault password step using `VAULT_PASSWORD_PROD` and a cleanup step that removes the vault password file and SSH key.
- The drift detection workflow creates GitHub issues with `GITHUB_TOKEN` but did not declare the required token permissions. Added `contents: read` and `issues: write` to the drift check job.
- The rollback playbook used `retries` and `delay` on the `uri` task without an explicit `until` condition. Added `register: health_check` and `until: health_check.status == 200` so the health check retry behavior is clear and compatible with documented Ansible retry patterns.
- The rollback playbook notified `restart application` but did not define a matching handler in the snippet. Added a minimal service handler using `app_service`.

## Review Notes
- The GitHub Actions YAML examples use current workflow syntax for `pull_request`, `push`, scheduled workflows, release `published` events, environments, concurrency, and `$GITHUB_OUTPUT`.
- The Ansible CLI flags shown, including `--syntax-check`, `--vault-password-file`, `--check`, `--diff`, and `-e`, are current.
- `--diff` can reveal sensitive values in task output; teams should use `diff: false` or `no_log` on sensitive tasks where appropriate.

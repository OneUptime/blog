# Validation Summary: How to Create Ansible Deployment Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and roles
- Ansible rolling deployments with `serial`
- Ansible rollback and health-check playbooks
- GitHub Actions CI/CD workflows
- SSH and Ansible Vault usage in CI

## Sources Consulted
- Ansible playbook strategies and `serial`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible handlers execution order: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible special variables including `ansible_host` and `inventory_hostname`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible `get_url` checksum documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `file` module symlink documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible 13 porting guide: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_13.html
- PyPI `ansible` package release information: https://pypi.org/project/ansible/
- GitHub Actions `inputs` context documentation: https://docs.github.com/en/actions/learn-github-actions/contexts
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The rollback playbook selected the second-newest release by modification time, which can be wrong if the current symlink does not point at the newest release. Changed it to exclude the current symlink target and roll back to the newest remaining release.
- The health-check playbook used `ansible_host` directly. Official Ansible docs describe `ansible_host` as an optional connection variable, so it may be undefined. Added `default(inventory_hostname)` fallbacks.
- The GitHub Actions example pinned `ansible==8.7.0`, which is outdated for a current deployment-pipeline guide. Updated the examples to `ansible==13.7.0`, the current stable PyPI release at validation time.
- The GitHub Actions workflow used `inputs.version` in push-triggered runs. The official GitHub Actions docs scope the `inputs` context to reusable or manually triggered workflows. Added an event-name guard before reading the manual input value.
- The staging skip condition referenced `inputs.skip_staging` directly. Added an event-name guard so push-triggered runs do not depend on dispatch-only inputs.

## Review Notes
The remaining examples use short Ansible module names such as `uri`, `file`, and `get_url`. These are still valid for built-in modules, though Ansible documentation recommends fully qualified collection names for clearer linking and to avoid name collisions.

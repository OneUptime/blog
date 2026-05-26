# Validation Summary: How to Set Up Ansible Syntax Checking in CI

## Status
validated

## Post Type
Tutorial / CI guide

## Technologies Covered
- Ansible and ansible-core CLI tools
- Ansible playbook syntax checking
- Ansible inventory validation
- Ansible check mode and diff mode
- yamllint
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Jinja2 template parsing
- pre-commit hooks

## Sources Consulted
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible release and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible PyPI release metadata: https://pypi.org/project/ansible/
- ansible-lint syntax-check rule documentation: https://docs.ansible.com/projects/lint/rules/syntax-check/
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- Jinja2 API documentation: https://jinja.palletsprojects.com/en/stable/api/
- pre-commit hook configuration documentation: https://pre-commit.com/

## Issues Found
- The post overstated what Ansible syntax checking catches by saying it catches invalid module parameters generally. Updated the description, introduction, and catch list to say it catches missing includes, unknown modules, and some variable issues, while retaining the warning that module-specific parameter validation is not fully covered by `--syntax-check`.
- The CI examples pinned `ansible==8.7.0`, which is now an unmaintained Ansible community package release. Updated the examples to `ansible==13.7.0`, the current stable package version available on PyPI on 2026-05-26.
- The examples used Python 3.11 with the updated Ansible package. Current Ansible 13.x / ansible-core 2.20 requires Python 3.12 or newer on the control node, so the GitHub Actions and GitLab CI examples now use Python 3.12.
- The Jinja2 template checking script passed `undefined=lambda *args: ''` to `Environment`, but Jinja2 expects an `Undefined` class or subclass. Updated the script to import and pass `Undefined`.

## Review Notes
The shell and CI snippets are examples and assume the referenced directories and inventory files exist in the target repository. Ansible itself was not installed in this workspace, so Ansible command behavior was verified against official CLI documentation rather than executed locally. YAML snippets and the corrected Jinja2 `Environment` construction were checked locally.

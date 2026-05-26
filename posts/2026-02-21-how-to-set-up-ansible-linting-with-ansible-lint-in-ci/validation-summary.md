# Validation Summary: How to Set Up Ansible Linting with ansible-lint in CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML
- GitHub Actions
- GitLab CI
- Jenkins
- pre-commit
- SARIF and Code Climate reports

## Sources Consulted
- Ansible Lint official configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint official usage and CLI documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint official profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible Lint official custom rules documentation: https://docs.ansible.com/projects/lint/custom-rules/
- ansible-lint v6.22.0 tagged documentation and `.ansible-lint` example: https://github.com/ansible/ansible-lint/tree/v6.22.0
- ansible-lint v6.22.0 CLI help output from a temporary local install
- ansible-lint 26.4.0 CLI help output from a temporary local install

## Issues Found
- The local run example used `ansible-lint -p production playbooks/`. In ansible-lint 6.22.0, `-p` means parseable output, not profile selection. Changed it to `ansible-lint --profile production playbooks/`.
- The local run example used `ansible-lint -R` to show detailed rule descriptions. In ansible-lint, `-R` keeps default rules when custom rule directories are provided. Changed it to `ansible-lint -L -f full`.
- The basic configuration snippet listed profiles without the `min` profile. Added `min` to match the official profile list.
- The configuration snippet included `parseable: true`, which is accepted by ansible-lint 6.22.0 but rejected by current ansible-lint 26.x configuration validation. Removed it because the post also shows installing the latest ansible-lint.
- The configuration comment described `mock_modules` and `mock_roles` as setting severity for mock errors. Updated it to explain that they mock unavailable modules or roles for syntax checks.
- The profile description said `production` enables all rules. Official docs describe `production` as the strictest profile for validated or certified content, but opt-in and experimental rules are still handled separately. Updated the wording.

## Review Notes
The examples are otherwise technically sound for the pinned `ansible-lint==6.22.0` used in the CI snippets. The pinned version is older than the current 26.x release line, so future updates may want to refresh version pins and Python versions together.

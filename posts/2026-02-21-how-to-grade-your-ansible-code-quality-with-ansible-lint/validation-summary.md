# Validation Summary: How to Grade Your Ansible Code Quality with ansible-lint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML
- Bash
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- Ansible Lint Profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible Lint Usage and CLI options documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint Configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint no-changed-when rule documentation: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- Ansible Lint no-log-password rule documentation: https://docs.ansible.com/projects/lint/rules/no-log-password/
- Ansible Lint command-instead-of-shell rule documentation: https://docs.ansible.com/projects/lint/rules/command-instead-of-shell/
- Ansible Lint command-instead-of-module rule documentation: https://docs.ansible.com/projects/lint/rules/command-instead-of-module/
- Ansible Lint galaxy rule documentation: https://docs.ansible.com/projects/lint/rules/galaxy/

## Issues Found
- The post used `ansible-lint -p <profile>` for profile selection, but current ansible-lint documents `--profile <profile>`. Updated all profile commands in examples, scripts, GitHub Actions, and GitLab CI to use `--profile`.
- The profile descriptions placed FQCN and idempotency checks under the moderate profile. Official profiles currently list FQCN under production and `no-changed-when` under shared. Updated the descriptions and example analysis accordingly.
- The safety profile description said it enforced `no_log` requirements and using `uri` instead of shell. The official safety profile includes rules such as `risky-file-permissions`, `risky-shell-pipe`, `latest`, and `package-latest`; `no-log-password` is opt-in. Updated the safety description and improvement tips.
- The configuration comment for `strict: true` implied all current violations become errors. Current CLI documentation says strict mode returns a non-zero exit code on warnings as well as errors. Updated the comment.
- The custom profile example used `enable_list` for non-opt-in rules. Updated it to use documented opt-in rules such as `no-log-password`, `name[prefix]`, and `galaxy-version-incorrect`.
- The tips section said FQCN is the main basic-to-moderate blocker and referenced unused variables as a shared-to-production issue. Updated the advice to align with documented profile rule membership.

## Review Notes
ansible-lint was not installed in the local environment, and creating a temporary virtual environment failed because `ensurepip`/`python3-venv` is unavailable. The review was completed against current official Ansible Lint documentation.

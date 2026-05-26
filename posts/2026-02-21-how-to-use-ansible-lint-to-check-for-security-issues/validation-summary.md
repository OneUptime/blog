# Validation Summary: How to Use ansible-lint to Check for Security Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML playbooks and configuration
- GitLab CI
- GitHub Actions
- Python custom ansible-lint rules

## Sources Consulted
- Ansible-lint rules index: https://docs.ansible.com/projects/lint/rules/
- Ansible-lint usage and CLI options: https://docs.ansible.com/projects/lint/usage/
- Ansible-lint configuration: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint custom rules: https://docs.ansible.com/projects/lint/custom-rules/
- `no-log-password` rule: https://docs.ansible.com/projects/lint/rules/no-log-password/
- `command-instead-of-module` rule: https://docs.ansible.com/projects/lint/rules/command-instead-of-module/
- `no-changed-when` rule: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- `risky-file-permissions` rule: https://docs.ansible.com/projects/lint/rules/risky-file-permissions/
- `risky-shell-pipe` rule: https://docs.ansible.com/projects/lint/rules/risky-shell-pipe/
- Local verification with `ansible-lint 26.4.0`.

## Issues Found
- The post stated that version 6.0 or later was specifically required for many security-related rules. I changed this to recommend a current supported version, which is more accurate for the current CLI and rule set.
- The `no-changed-when (command-instead-of-module)` heading mixed two separate rules. I changed the heading to name both rules accurately.
- The `no-log-password (risky-file-permissions)` heading mixed unrelated rules, and the example did not match what `no-log-password` detects. I changed it to a looped password example and noted that `no-log-password` is opt-in.
- The security-focused scan command used `-t security` without enabling the opt-in `no-log-password` rule. I added `--enable-list no-log-password` and changed the rule listing command from `-L | grep -i security` to `-T`, which is the documented way to see tags and covered rules.
- The `.ansible-lint` example incorrectly described `warn_list` as treating warnings as errors. I removed that incorrect setting and kept `strict: true`, which is the documented setting for returning a non-zero exit code on warnings as well as errors.
- The GitLab CI and GitHub Actions examples used `-t security` without enabling `no-log-password`. I added `--enable-list no-log-password`.
- The custom rule emitted a current ansible-lint warning because `version_changed` was missing. I added `version_changed = "1.0.0"` and verified the rule loads and reports a hardcoded IP.
- The report generation section described `-f json` as generic JSON output. In current ansible-lint, SARIF is the recommended JSON report format and `json` is no longer the Code Climate format. I changed the example to `-f sarif` and kept `-f codeclimate` for Code Climate output.

## Review Notes
The article remains technically relevant. Several checks discussed as security useful are not all tagged `security` in current ansible-lint; the post now calls out that distinction.

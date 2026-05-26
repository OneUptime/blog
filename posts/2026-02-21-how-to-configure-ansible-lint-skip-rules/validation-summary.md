# Validation Summary: How to Configure ansible-lint Skip Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML configuration
- Command-line linting workflows

## Sources Consulted
- Official ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Official ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Official ansible-lint `syntax-check` rule documentation: https://docs.ansible.com/projects/lint/rules/syntax-check/
- Official ansible-lint source constants for renamed numeric rule IDs: https://github.com/ansible/ansible-lint/blob/main/src/ansiblelint/constants.py
- Official ansible-lint CLI parser source for command-line merge behavior and supported environment variables: https://github.com/ansible/ansible-lint/blob/main/src/ansiblelint/cli.py

## Issues Found
- The old-style numeric rule ID example used `301` for `command-instead-of-module`. In current ansible-lint mappings, `301` maps to `no-changed-when`; `303` maps to `command-instead-of-module`. Changed the example to `303`.
- The `warn_list` explanation omitted strict mode. Added that warnings do not cause a non-zero exit code unless ansible-lint is run in strict mode.
- The post claimed bare `# noqa` suppresses all linting for a task. Current official guidance uses the `skip_ansible_lint` tag to skip all task-based rules, and this does not skip line-based rules. Replaced the example and wording.
- The post said command-line arguments override configuration file values. Current ansible-lint documentation states list values such as `skip_list`, `warn_list`, and `exclude_paths` are appended to config values, not replaced. Updated the wording and CLI comment.
- The post documented an unsupported `ANSIBLE_LINT_SKIP_LIST` environment variable. Replaced that section with the officially supported `.ansible-lint-ignore` file mechanism.
- The legacy-project example used `progressive: true`, but `--progressive` mode was removed in ansible-lint 6.16.0. Removed that setting.
- The CI example used `--warn-list ""` to make warnings become errors. Current ansible-lint supports `--strict` for making warnings return a non-zero exit code. Updated the command.

## Review Notes
The local environment did not have `ansible-lint` installed, so CLI behavior was verified against official documentation and the upstream ansible-lint source instead of local `--help` output.

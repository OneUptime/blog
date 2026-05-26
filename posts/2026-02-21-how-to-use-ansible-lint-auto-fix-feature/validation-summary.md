# Validation Summary: How to Use ansible-lint Auto-Fix Feature

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- YAML
- pre-commit
- Bash scripting
- Molecule

## Sources Consulted
- Ansible Lint Autofix documentation: https://docs.ansible.com/projects/lint/autofix/
- Ansible Lint Configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint Usage documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint Rules index: https://docs.ansible.com/projects/lint/rules/
- Ansible Lint no-changed-when rule: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- Ansible Lint fqcn rule: https://docs.ansible.com/projects/lint/rules/fqcn/
- Ansible Lint latest GitHub release: https://github.com/ansible/ansible-lint/releases/latest
- pre-commit documentation: https://pre-commit.com/

## Issues Found
- The post claimed auto-fix updates deprecated `include` to `include_tasks` or `import_tasks`. The official autofix list does not include that transform, so this was changed to the supported `deprecated-local-action` transform.
- The post claimed auto-fix adds missing `changed_when` to command and shell tasks. The `no-changed-when` rule is documented, but it is not listed as an autofix-supported rule, so this was replaced with the supported `command-instead-of-shell` transform.
- The selective auto-fix examples used `--fix -t ...`. The current documented way to limit transforms is the optional `--fix=WRITE_LIST` value, so the examples were changed to `--fix=fqcn`, `--fix=yaml`, and `--fix=deprecated-local-action`.
- The configuration snippet implied `warn_list` controls whether a rule is auto-fixed. Official documentation defines `write_list` for controlling transforms, while `warn_list` controls warning behavior, so the snippet and comments were corrected.
- The batch script parsed `ansible-lint -f json` as a list with `filename` fields. Current ansible-lint JSON output is not safe to parse that way, so the script now uses `-f pep8 --show-relpath` with `awk` to extract filenames.
- The pre-commit snippet used an outdated `ansible-lint` release tag and implied modified files are committed automatically. The release tag was updated to `v26.4.0`, and the commit workflow now tells readers to review, restage, and retry when the hook modifies files.

## Review Notes
The local environment did not have `ansible-lint` installed, so CLI behavior was validated against the current official Ansible Lint documentation rather than local `--help` output.

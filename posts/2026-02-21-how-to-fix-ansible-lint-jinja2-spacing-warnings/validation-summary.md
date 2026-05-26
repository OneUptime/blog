# Validation Summary: How to Fix ansible-lint Jinja2 Spacing Warnings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- Jinja2
- YAML
- VS Code Ansible extension

## Sources Consulted
- Ansible Lint jinja rule documentation: https://docs.ansible.com/projects/lint/rules/jinja/
- Ansible Lint no-jinja-when rule documentation: https://docs.ansible.com/projects/lint/rules/no-jinja-when/
- Ansible Lint usage and CLI options: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible VS Code extension configuration documentation: https://docs.ansible.com/projects/vscode-ansible/configuration/
- j2lint package documentation: https://pypi.org/project/j2lint/
- Local ansible-lint 25.12.1 CLI help output and sample lint runs
- Local j2lint 1.2.0 CLI help output

## Issues Found
- The post described ansible-lint's core spacing rule too narrowly as exactly one space after Jinja delimiters. Updated the wording to match the official rule more accurately: ansible-lint checks readable spacing inside Jinja2 expressions, including spacing around variables, operators, and filters.
- The post said ansible-lint checks `.j2` template files when referenced by tasks. Current ansible-lint behavior and documentation focus on Jinja2 embedded in Ansible YAML, so the wording was changed to recommend a dedicated Jinja2 linter for standalone templates.
- The post called `j2lint` a Jinja2 formatter. `j2lint` is documented and exposed by its CLI as a linter, so the text now describes it as a linter.
- The post described `ansible-lint --fix` as experimental. Current ansible-lint documentation lists `--fix` as a normal CLI option, so the wording was updated.
- The post showed `ansible-lint --fix --diff playbook.yml`, but current ansible-lint help does not include a `--diff` option. Replaced it with `git diff -- playbook.yml` as the review step after running `--fix`.

## Review Notes
The examples for Jinja2 filter spacing, implicit Jinja2 conditionals in `when`, `no-jinja-when`, `skip_list`, `warn_list`, and VS Code lint settings match current documentation. ansible-lint's `jinja[spacing]` warning is in the default warning list, so teams using default settings may see it as a warning rather than a failure unless they run with stricter settings.

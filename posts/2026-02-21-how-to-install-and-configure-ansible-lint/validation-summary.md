# Validation Summary: How to Install and Configure ansible-lint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- ansible.cfg
- pip, pipx, and Homebrew installation workflows
- YAML configuration

## Sources Consulted
- Ansible Lint installation documentation: https://docs.ansible.com/projects/lint/installing/
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint usage and CLI documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible configuration settings for collections_path: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- pipx installation documentation: https://pipx.pypa.io/stable/how-to/install-pipx/
- Homebrew ansible-lint formula: https://formulae.brew.sh/formula/ansible-lint.html
- Local ansible-lint 26.4.0 CLI help and config validation output

## Issues Found
- The post described pip in a virtual environment as the recommended ansible-lint installation method. Current ansible-lint documentation recommends the ansible-dev-tools package, while direct pip installation is still supported. Changed the wording to "A common direct approach" to avoid overstating the recommendation.
- The pipx bootstrap command used `pip install pipx`. pipx documentation recommends `python3 -m pip install --user pipx` for pip-based installation, so the command was updated.
- The no-argument `ansible-lint` example said it lints all YAML files in the current directory. Current ansible-lint help describes this as auto-detection mode, so the comment was corrected.
- A configuration comment said `warn_list` treats warnings as errors. `warn_list` does the opposite: listed rules are warnings instead of fatal violations. The comment was corrected.
- The post documented `progressive: true`, but ansible-lint removed progressive mode in v6.16.0. Replaced that section with the supported `.ansible-lint-ignore` gradual-adoption workflow using `ansible-lint --generate-ignore`.
- The example `.ansible-lint` config included a commented `collections_paths` setting. Current ansible-lint configuration does not support that key; collection paths should be configured through Ansible configuration such as `ansible.cfg`. The comment was corrected.
- The starter config mentioned `parseable: true`, which is not a current ansible-lint configuration option. Replaced it with guidance to use `-f pep8` on the command line for machine-parseable output.
- The ansible.cfg explanation used the deprecated/plural-style wording `collections_paths`. Current Ansible configuration uses `collections_path` as the ini key, so the wording was corrected.

## Review Notes
- The corrected main and starter ansible-lint configuration snippets were validated locally with ansible-lint 26.4.0.
- The Homebrew installation command is valid according to the Homebrew formula, although Homebrew is not one of the installation methods listed in the upstream ansible-lint installation documentation.

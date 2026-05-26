# Validation Summary: How to Use Molecule lint to Check Ansible Syntax

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- ansible-lint
- yamllint
- pre-commit
- GitHub Actions
- Bash

## Sources Consulted
- Ansible Molecule command and workflow documentation: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule v5.0.0 release notes showing removal of the lint command: https://github.com/ansible/molecule/releases/tag/v5.0.0
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- ansible-lint v26.4.0 release page: https://github.com/ansible/ansible-lint/releases/tag/v26.4.0
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- yamllint v1.38.0 release page: https://github.com/adrienverge/yamllint/releases/tag/v1.38.0

## Issues Found
- The post claimed that Molecule 6+ configures linting through a `lint` key and supports `molecule lint`. Molecule removed the lint command in v5.0.0, and current Molecule documentation lists `syntax`, not `lint`, as the built-in pre-create check. Updated the post to explain that current Molecule users should run linters directly, through wrapper scripts, pre-commit, or CI, and use `molecule syntax` for Molecule's built-in syntax action.
- The custom lint script section showed referencing the script from `molecule.yml` with `lint: |`, which is not valid for current Molecule. Updated it to show running the script from CI, a Makefile, or another wrapper command.
- The yamllint example described `yamllint -s .` as "show only errors." In yamllint, `-s` / `--strict` changes exit-code behavior for warnings; `--no-warnings` suppresses warning output. Updated the command to `yamllint --no-warnings .`.
- The ansible-lint example used `ansible-lint -R -r no-changed-when .` to check a specific rule. `-r` is for custom rules directories and `-R` keeps default rules when custom rule directories are used. Updated the example to use `ansible-lint -t no-changed-when .`.
- The ansible-lint example described `ansible-lint -R` as showing rules with descriptions. `-R` is not a listing command; `-L` lists rules and `-T` lists tags and covered rules. Updated the example to show `ansible-lint -T`.
- The `.ansible-lint` config comments incorrectly said `strict: false` treats warnings as errors and `use_default_rules: true` enforces FQCN. Updated those comments to match the documented behavior.
- The yamllint comments rule comment said comments without a space after `#` were allowed while the config required a starting space. Updated the comment to match the configured rule.
- The pre-commit examples pinned older hook revisions. Updated the examples to current release tags verified during review: `yamllint` v1.38.0 and `ansible-lint` v26.4.0.

## Review Notes
The post is now accurate for current Molecule 5+ behavior while preserving legacy notes for Molecule 3/4 and very old Molecule configurations. Future maintenance should periodically refresh pinned pre-commit hook versions or replace them with a note to run `pre-commit autoupdate`.

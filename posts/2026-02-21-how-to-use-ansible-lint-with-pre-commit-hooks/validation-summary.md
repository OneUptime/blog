# Validation Summary: How to Use ansible-lint with Pre-Commit Hooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-lint
- pre-commit
- Git hooks
- yamllint
- Ansible Galaxy collection requirements

## Sources Consulted
- Ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible-lint v26.4.0 pre-commit hook metadata: https://raw.githubusercontent.com/ansible/ansible-lint/v26.4.0/.pre-commit-hooks.yaml
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- pre-commit documentation: https://pre-commit.com/
- pre-commit-hooks documentation: https://github.com/pre-commit/pre-commit-hooks
- ansible-lint releases: https://github.com/ansible/ansible-lint/releases
- yamllint documentation: https://yamllint.readthedocs.io/en/stable/

## Issues Found
- The initial `.pre-commit-config.yaml` overrode the ansible-lint hook with custom `entry`, `language`, `files`, and `exclude` settings, which obscured the upstream hook behavior. Replaced it with the official minimal hook configuration and moved non-Ansible YAML exclusions to `.ansible-lint` `exclude_paths`.
- The post said ansible-lint runs only on staged files through pre-commit. The official hook sets `pass_filenames: false` and `always_run: true`, so it runs from the repository root and lets ansible-lint discover content. Updated the explanation and speed section.
- The testing section used `pre-commit run ansible-lint --files playbooks/site.yml` as a targeted-file example. Because the official ansible-lint hook ignores passed filenames, changed the targeted example to `ansible-lint playbooks/site.yml`.
- The collection dependency examples used `additional_dependencies` for Ansible Galaxy collections such as `ansible.posix` and `community.general`. Those are not Python package dependencies; changed the example to a standard `requirements.yml` collection file.
- The post recommended `progressive: true`, but ansible-lint removed progressive mode in v6.16.0. Replaced that section with a supported `profile: moderate` configuration.
- Updated stale hook versions in examples to current stable release tags available during review: `ansible-lint` v26.4.0, `pre-commit-hooks` v6.0.0, and `yamllint` v1.37.1.

## Review Notes
The Makefile still installs `ansible-lint` locally even though pre-commit creates its own hook environment. This is not technically wrong because it also supports direct local linting, but teams should understand that pre-commit will not automatically reuse the system-installed ansible-lint package.

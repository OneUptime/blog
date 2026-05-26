# Validation Summary: How to Use ansible-lint Profiles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- ansible-lint profiles
- YAML configuration

## Sources Consulted
- Ansible Lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible Lint usage and CLI documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint latest rule documentation: https://docs.ansible.com/projects/lint/rules/latest/
- Ansible Lint package-latest rule documentation: https://docs.ansible.com/projects/lint/rules/package-latest/
- Ansible Lint deprecated-bare-vars rule documentation: https://docs.ansible.com/projects/lint/rules/deprecated-bare-vars/
- Ansible Lint partial-become rule documentation: https://docs.ansible.com/projects/lint/rules/partial-become/
- Ansible Lint playbook-extension rule documentation: https://docs.ansible.com/projects/lint/rules/playbook-extension/
- Ansible Lint name rule documentation: https://docs.ansible.com/projects/lint/rules/name/
- Ansible Lint fqcn rule documentation: https://docs.ansible.com/projects/lint/rules/fqcn/

## Issues Found
- The CLI examples used `ansible-lint -p ...` for profiles. Current ansible-lint documents `--profile` for profile selection, so the commands were changed to `ansible-lint --profile ...`.
- Several profile rule lists were inaccurate or incomplete compared with the current official profiles documentation. The `basic`, `moderate`, `safety`, `shared`, and `production` rule lists were updated to match current rule IDs and profile placement.
- The `partial-become` description was reversed. It now correctly says the rule checks for `become_user` without an explicit `become`.
- The `playbook-extension` description incorrectly implied only `.yml` was valid. It now states that `.yml` and `.yaml` are valid playbook extensions.
- The `deprecated-bare-vars` example used a module argument where the documented rule example applies to ambiguous bare variables in loops. The example was replaced with a `with_items` case.
- The safety profile pip example implied an unversioned default `pip` install is what the rule catches. It now shows `state: latest`, which is the behavior covered by the `package-latest` rule.
- The side-by-side comparison incorrectly associated FQCN checks with `basic` and implicit behavior checks with `production`. The comments and expected-result descriptions were updated to align with current profile placement.
- The migration strategy suggested `production` for shared roles and collections. It now recommends `shared` or `production` for content intended for publication or certification.

## Review Notes
The local environment did not have `ansible-lint` or `ansible` installed, so validation was performed against the current official Ansible Lint documentation rather than local CLI execution.

# Validation Summary: How to Write Custom ansible-lint Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- Python
- pytest
- setuptools packaging
- YAML configuration

## Sources Consulted
- Ansible Lint custom rules documentation: https://docs.ansible.com/projects/lint/custom-rules/
- Ansible Lint usage and CLI documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint installation documentation: https://docs.ansible.com/projects/lint/installing/
- Installed ansible-lint 26.4.0 source/API signatures for `AnsibleLintRule`, `TransformMixin`, `Runner`, `Options`, and `RulesCollection`.

## Issues Found
- The rule API example used `version_added`, but current ansible-lint rule metadata uses `version_changed`; updated the examples to use `version_changed = "1.0.0"` so custom rules do not emit invalid metadata warnings.
- The file-level rule used the old `matchyaml(self, file, data)` signature. Current ansible-lint calls `matchyaml(self, file)` and exposes parsed YAML as `file.data`; updated the signature.
- The file-level rule called `create_matcherror(..., linenumber=...)`, but the current parameter is `lineno`; updated the call.
- The auto-fix section claimed the rule could fix issues automatically but did not implement ansible-lint's transform API. Updated it to subclass `TransformMixin`, return a `MatchError`, and implement `transform()` with `match.fixed = True`.
- The pytest example used `Runner(str(playbook), rules_dir=["custom_rules"])`, which is not supported by the current `Runner` constructor. Updated the test helper to create `Options`, `RulesCollection`, and `Runner` using the current API.
- The play-level variable example treated dictionary keys inside `vars_prompt` as variable names. Updated it to read the prompt variable from the `name` field and to inspect only variables available in the current play data.
- The packaging example imported `find_packages` but no longer used it after mapping `custom_rules` into an importable package; removed the unused import.

## Review Notes
The examples are now accurate for current ansible-lint behavior verified with ansible-lint 26.4.0. The packaging example still uses a virtualenv-specific `site-packages` path, which works as shown but should be adjusted to the target environment's Python version and virtualenv location.

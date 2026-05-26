# Validation Summary: How to Use ansible-lint with Custom Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-lint
- Python custom rule classes
- YAML ansible-lint configuration
- Python packaging with setuptools

## Sources Consulted
- Ansible Lint custom rules documentation: https://docs.ansible.com/projects/lint/custom-rules/
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- ansible-lint 26.4.0 installed package source for `AnsibleLintRule`, rule loading, and CLI behavior.

## Issues Found
- The `.ansible-lint` example used `profile: moderate`, which prevents custom rules from running unless they are explicitly enabled. Removed the profile line so `rulesdir` custom rules run alongside the default rules.
- The examples used `version_added`, but current ansible-lint rules use `version_changed`, and omitting it produces warnings. Replaced it in the skeleton and added `version_changed = "1.0.0"` to the custom rule examples.
- The banned-module and `set_fact` examples assumed `__ansible_module__` contains a fully qualified collection name. Current ansible-lint normalizes that field to short module names such as `raw` and `set_fact`, while `__ansible_module_original__` preserves the original name. Updated the comparisons accordingly.
- The hardcoded-secret example used the old `matchlines(self, file, text)` signature and passed `linenumber` to `create_matcherror`. Current ansible-lint uses `matchlines(self, file)`, `file.content`, and `lineno`. Updated the code.
- The sample output omitted the play-level `become_user` violation and had outdated line numbers/messages. Updated the expected output.
- The package sharing example used an unsupported `ansible_lint.rules` entry point. Current ansible-lint auto-loads packages installed under `ansiblelint.rules.custom`. Replaced the example with a setuptools `pyproject.toml` and `setup.cfg` mapping that installs rules into that package path.

## Review Notes
The corrected examples were tested against ansible-lint 26.4.0 installed into an isolated target directory. The custom-rule examples produced the expected violations, and the packaging layout installed files under `ansiblelint/rules/custom/...` for auto-discovery.

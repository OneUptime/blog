# Validation Summary: How to Set Up ansible-lint in VS Code

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Ansible
- ansible-lint
- Red Hat Ansible VS Code extension
- VS Code workspace settings, file associations, extension recommendations, and keybindings
- Python virtual environments
- EditorConfig

## Sources Consulted
- Ansible VS Code Extension documentation: https://docs.ansible.com/projects/vscode-ansible/
- Ansible VS Code Extension configuration reference: https://docs.ansible.com/projects/vscode-ansible/configuration/
- Red Hat Ansible VS Code extension package manifest: https://raw.githubusercontent.com/ansible/vscode-ansible/main/package.json
- ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- ansible-lint autofix documentation: https://docs.ansible.com/projects/lint/autofix/
- ansible-lint Jinja rule documentation: https://docs.ansible.com/projects/lint/rules/jinja/
- ansible-lint YAML rule documentation: https://docs.ansible.com/projects/lint/rules/yaml/
- VS Code extension recommendations documentation: https://code.visualstudio.com/docs/editor/extension-marketplace
- VS Code keybindings documentation: https://code.visualstudio.com/docs/configure/keybindings
- EditorConfig specification: https://spec.editorconfig.org/

## Issues Found
- The post described ansible-lint feedback as running in real time/as-you-type. The Ansible VS Code extension documentation states that ansible-lint runs when Ansible documents are opened and saved, so the wording was corrected to avoid implying per-keystroke linting.
- The Quick Fixes section described lightbulb-based fixes and specific placeholder generation that are not documented for the extension. It was changed to documented automatic fixes through `ansible.validation.lint.autoFixOnSave` and the `ansible-lint --fix` command.
- The Performance Tuning section suggested a setting snippet to make linting run only on save and mentioned a configurable per-keystroke lint delay. The extension already runs ansible-lint on open/save, and no current documented ansible-lint keystroke-delay setting was found, so that guidance was removed.
- The troubleshooting section suggested increasing a validation timeout, but no current documented Ansible extension validation timeout setting was found. The advice was narrowed to excluding large directories and checking terminal performance.

## Review Notes
The VS Code setting keys, extension identifier, ansible-lint config keys, file association syntax, workspace recommendations, EditorConfig example, and keybinding JSON structure were checked and are technically valid. The official Ansible VS Code documentation currently recommends the `ansible-dev-tools` package for a complete environment, but the post's `pip install ansible-lint` command remains valid for installing ansible-lint itself.

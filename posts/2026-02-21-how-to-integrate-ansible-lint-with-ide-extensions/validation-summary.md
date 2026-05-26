# Validation Summary: How to Integrate ansible-lint with IDE Extensions

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Ansible
- ansible-lint
- Ansible VS Code extension
- Ansible Language Server
- VS Code settings
- Neovim nvim-lint
- Vim/Neovim ALE
- coc.nvim
- JetBrains External Tools and File Watchers
- Python virtual environments
- npm

## Sources Consulted
- Ansible VS Code Extension configuration documentation: https://docs.ansible.com/projects/vscode-ansible/configuration/
- Ansible VS Code Extension Ansible Language Server documentation: https://docs.ansible.com/projects/vscode-ansible/als/
- Ansible VS Code Extension language server settings: https://docs.ansible.com/projects/vscode-ansible/als/settings/
- ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint usage and CLI documentation: https://docs.ansible.com/projects/lint/usage/
- ansible-lint galaxy rule documentation: https://docs.ansible.com/projects/lint/rules/galaxy/
- nvim-lint README and supported linters: https://github.com/mfussenegger/nvim-lint
- ALE README and supported tooling: https://github.com/dense-analysis/ale
- JetBrains File Watchers documentation: https://www.jetbrains.com/help/webstorm/using-file-watchers.html
- npm package metadata for @ansible/ansible-language-server: https://www.npmjs.com/package/@ansible/ansible-language-server

## Issues Found
- The JetBrains File Watcher example used `ansible-lint --parseable $FilePath$`. Current ansible-lint documentation does not list `--parseable`; it documents `-f pep8` as the machine-parseable output format. Changed the example to `Arguments: -f pep8 $FilePath$`.
- Confirmed the JetBrains output filter shape remains compatible with ansible-lint's documented pep8-style `file:line:column:` output.

## Review Notes
- The VS Code Ansible extension settings in the post match the current documented settings, including `ansible.validation.lint.enabled`, `ansible.validation.lint.path`, `ansible.validation.lint.arguments`, `ansible.python.interpreterPath`, and `ansible.ansible.useFullyQualifiedCollectionNames`.
- The Ansible Language Server configuration shape was checked against current language server settings and package contents; the nested `ansible.validation.lint` settings are consistent with the current server implementation.
- The nvim-lint example uses the documented `ansible_lint` linter name.
- The ansible-lint project configuration fields shown in `.ansible-lint` are valid current configuration keys.

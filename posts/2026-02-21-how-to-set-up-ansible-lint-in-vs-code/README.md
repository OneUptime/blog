# How to Set Up ansible-lint in VS Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, VS Code, IDE

Description: Configure VS Code to run ansible-lint in real time with the Ansible extension, providing inline warnings, auto-completion, and quick fixes.

---

Running ansible-lint from the terminal is fine, but seeing lint warnings directly in your editor as you type is much better. VS Code has excellent support for Ansible through the official Red Hat Ansible extension, which integrates ansible-lint to provide real-time feedback, inline diagnostics, and even auto-fix capabilities.

This guide walks through setting up VS Code for Ansible development with full ansible-lint integration.

## Prerequisites

Before configuring VS Code, make sure you have ansible-lint installed and accessible:

```bash
# Install ansible-lint in a virtual environment or globally
pip install ansible-lint

# Verify it works
ansible-lint --version

# Note the path for VS Code configuration
which ansible-lint
```

## Installing the Ansible Extension

The official extension is published by Red Hat. Install it from the VS Code marketplace:

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS) to open Extensions
3. Search for "Ansible" by Red Hat
4. Click Install

Or install from the command line:

```bash
code --install-extension redhat.ansible
```

The extension provides:
- Syntax highlighting for Ansible YAML
- ansible-lint integration with inline diagnostics
- Auto-completion for modules, directives, and Jinja2
- Hover documentation for modules
- Go-to-definition for roles and tasks

## Configuring the Extension

Create or update your VS Code settings. You can do this per-project (recommended) or globally.

### Per-Project Settings

Create a `.vscode/settings.json` file in your project root:

```json
{
    "ansible.validation.enabled": true,
    "ansible.validation.lint.enabled": true,
    "ansible.validation.lint.path": "ansible-lint",
    "ansible.validation.lint.arguments": "",
    "ansible.python.interpreterPath": "",
    "ansible.ansible.path": "ansible",
    "ansible.ansible.useFullyQualifiedCollectionNames": true,
    "ansible.completion.provideRedirectModules": true,
    "ansible.completion.provideModuleOptionAliases": true,

    "[ansible]": {
        "editor.tabSize": 2,
        "editor.insertSpaces": true,
        "editor.autoIndent": "advanced",
        "editor.quickSuggestions": {
            "comments": true,
            "other": true,
            "strings": true
        },
        "editor.detectIndentation": false
    },

    "files.associations": {
        "*.yml": "ansible",
        "*.yaml": "ansible"
    }
}
```

### File Associations

The Ansible extension needs to know which files are Ansible files. By default, it uses heuristics, but you can be explicit:

```json
{
    "files.associations": {
        "playbooks/*.yml": "ansible",
        "roles/**/*.yml": "ansible",
        "tasks/*.yml": "ansible",
        "handlers/*.yml": "ansible",
        "inventory/**/*.yml": "yaml",
        "docker-compose.yml": "yaml",
        ".github/**/*.yml": "yaml"
    }
}
```

This tells VS Code to treat playbook and role files as Ansible but keep Docker Compose and GitHub Actions files as plain YAML.

## Using a Virtual Environment

If ansible-lint is installed in a virtual environment, point VS Code to it:

```json
{
    "ansible.python.interpreterPath": "${workspaceFolder}/venv/bin/python",
    "ansible.validation.lint.path": "${workspaceFolder}/venv/bin/ansible-lint"
}
```

Or use the Python extension's interpreter selection:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "Python: Select Interpreter"
3. Choose the virtual environment that has ansible-lint installed

## Understanding the Diagnostics

Once configured, ansible-lint runs automatically when you open or save an Ansible file. Violations appear as:

- **Red underlines**: Errors (rules that cause lint failure)
- **Yellow underlines**: Warnings (rules in `warn_list`)
- **Blue underlines**: Information (hints)

Hover over any underlined text to see the rule ID and description.

The Problems panel (`Ctrl+Shift+M` or `Cmd+Shift+M`) shows all diagnostics across open files:

```
playbook.yml
  Line 5: fqcn[action-core]: Use FQCN for builtin module actions (ansible-lint)
  Line 12: name[missing]: All tasks should be named (ansible-lint)
  Line 18: yaml[truthy]: Truthy value should be one of [false, true] (ansible-lint)
```

## Quick Fixes

Some ansible-lint rules support quick fixes. When you see a lightbulb icon next to a warning, click it (or press `Ctrl+.`) to see available fixes:

- Fix Jinja2 spacing
- Fix truthy values (`yes` to `true`)
- Add missing task names (generates a placeholder)

## Configuring ansible-lint for VS Code

Make sure your `.ansible-lint` configuration file is in the workspace root. The extension picks it up automatically:

```yaml
# .ansible-lint - Used by both CLI and VS Code
---
profile: moderate

exclude_paths:
  - .cache/
  - .git/
  - collections/

skip_list:
  - yaml[line-length]

warn_list:
  - experimental
```

## Performance Tuning

ansible-lint can be slow on large projects. Here are some VS Code settings to improve performance:

```json
{
    "ansible.validation.lint.enabled": true,
    "files.watcherExclude": {
        "**/collections/**": true,
        "**/.git/**": true,
        "**/venv/**": true,
        "**/.cache/**": true,
        "**/node_modules/**": true
    },
    "search.exclude": {
        "**/collections": true,
        "**/venv": true,
        "**/.cache": true
    }
}
```

If ansible-lint is still too slow for real-time feedback, you can configure it to run only on save:

```json
{
    "ansible.validation.lint.enabled": true
}
```

The extension runs lint on file save by default. If you want it to run on every keystroke, the delay is configurable but can be resource-intensive.

## Recommended Extensions for Ansible Development

Beyond the Ansible extension, these complement your Ansible workflow in VS Code:

```json
{
    "recommendations": [
        "redhat.ansible",
        "redhat.vscode-yaml",
        "ms-python.python",
        "editorconfig.editorconfig",
        "mhutchie.git-graph",
        "eamodio.gitlens"
    ]
}
```

Save this as `.vscode/extensions.json` so team members get extension recommendations when they open the project.

## EditorConfig for Consistency

Create an `.editorconfig` file to ensure consistent formatting regardless of editor settings:

```ini
# .editorconfig - Consistent formatting across editors
root = true

[*]
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8

[*.{yml,yaml}]
indent_style = space
indent_size = 2

[*.{j2,jinja2}]
indent_style = space
indent_size = 2

[Makefile]
indent_style = tab
```

## Workspace Setup for Multi-Root Projects

If your Ansible project spans multiple directories (roles in one repo, playbooks in another), use a VS Code workspace:

```json
{
    "folders": [
        {
            "path": "../ansible-playbooks",
            "name": "Playbooks"
        },
        {
            "path": "../ansible-roles",
            "name": "Roles"
        },
        {
            "path": "../ansible-collections",
            "name": "Collections"
        }
    ],
    "settings": {
        "ansible.validation.lint.enabled": true,
        "ansible.validation.lint.path": "ansible-lint"
    }
}
```

## Keyboard Shortcuts

Set up keyboard shortcuts for common Ansible/lint operations:

```json
// keybindings.json - Useful shortcuts
[
    {
        "key": "ctrl+shift+l",
        "command": "workbench.action.problems.focus",
        "when": "editorTextFocus"
    },
    {
        "key": "ctrl+shift+a",
        "command": "workbench.action.terminal.sendSequence",
        "args": { "text": "ansible-lint\n" },
        "when": "terminalFocus"
    }
]
```

## Troubleshooting

**Extension not finding ansible-lint:** Check the `ansible.validation.lint.path` setting. Use an absolute path if the relative path does not work. Also verify that the Python interpreter configured for the extension has ansible-lint installed.

**No diagnostics appearing:** Make sure the file is recognized as Ansible (check the language mode in the bottom-right corner of VS Code). If it says "YAML" instead of "Ansible", right-click the language indicator and select "Ansible".

**Slow diagnostics:** Increase the validation timeout or exclude large directories from file watching. Check if ansible-lint runs quickly from the terminal first to rule out a tool-level issue.

Setting up ansible-lint in VS Code takes about 10 minutes and pays dividends immediately. You catch issues as you write code instead of discovering them when you push and CI fails. That tight feedback loop makes you a faster, more productive Ansible developer.

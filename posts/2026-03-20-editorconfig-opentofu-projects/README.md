# How to Set Up EditorConfig for OpenTofu Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, EditorConfig, IDE, Code Style, Developer Experience

Description: Learn how to configure EditorConfig for OpenTofu projects to ensure consistent indentation, line endings, and whitespace across all editors and IDEs used by your team.

## Introduction

EditorConfig sets editor-independent code style preferences that apply regardless of which editor team members use. For OpenTofu projects, it helps enforce the 2-space indentation used by `tofu fmt`, along with UTF-8 encoding and LF line endings that match OpenTofu's documented conventions, reducing the frequency of unnecessary formatting changes.

## Basic .editorconfig for OpenTofu

```ini
# .editorconfig

# EditorConfig documentation: https://editorconfig.org

# Top-most EditorConfig file
root = true

# Default settings for all files
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 4
trim_trailing_whitespace = true
insert_final_newline = true

# OpenTofu/Terraform files - 2-space indentation
[*.{tf,tofu}]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# HCL files (Packer, Nomad, Consul, Vault configs)
[*.hcl]
indent_style = space
indent_size = 2
end_of_line = lf

# Terraform variable files
[*.tfvars]
indent_style = space
indent_size = 2
end_of_line = lf

# Terraform state files (auto-generated, don't reformat)
[*.tfstate]
insert_final_newline = false

[*.tfstate.backup]
insert_final_newline = false

# YAML files (Terragrunt, CI/CD configs)
[*.{yml,yaml}]
indent_style = space
indent_size = 2
end_of_line = lf

# JSON files
[*.json]
indent_style = space
indent_size = 2
end_of_line = lf

# Shell scripts
[*.sh]
indent_style = space
indent_size = 2
end_of_line = lf

# Markdown documentation
[*.md]
# Trailing spaces are sometimes intentional in Markdown
trim_trailing_whitespace = false
indent_style = space
indent_size = 2

# Makefiles require tabs
[Makefile]
indent_style = tab
```

## VS Code Integration

EditorConfig support requires the EditorConfig extension, and OpenTofu projects work best with the OpenTofu extension:

```json
// .vscode/extensions.json - recommend extensions to team
{
  "recommendations": [
    "editorconfig.editorconfig",
    "opentofu.vscode-opentofu",
    "ms-azuretools.vscode-docker"
  ]
}
```

```json
// .vscode/settings.json - workspace settings for OpenTofu
{
  "editor.formatOnSave": true,
  "editor.rulers": [120],
  "[opentofu][opentofu-vars]": {
    "editor.defaultFormatter": "opentofu.vscode-opentofu",
    "editor.formatOnSave": true,
    "editor.formatOnSaveMode": "file"
  },
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

## JetBrains IDE (IntelliJ, GoLand)

JetBrains IDEs support EditorConfig natively. For `.tf`, `.tfvars`, and `.hcl` files, install the Terraform and HCL plugin:

1. Settings → Plugins → Marketplace → install `Terraform and HCL`
2. Settings → Editor → Code Style → Enable EditorConfig support
3. The `.editorconfig` file in the project root applies automatically

## Validating EditorConfig Configuration

```bash
# Install eclint to validate EditorConfig compliance
npm install -g eclint

# Check all files
eclint check '**/*.tf' '**/*.tofu' '**/*.tfvars' '**/*.hcl'

# Fix violations automatically
eclint fix '**/*.tf' '**/*.tofu'
```

## Pre-commit Integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/editorconfig-checker/editorconfig-checker.python
    rev: "3.6.1"
    hooks:
      - id: editorconfig-checker
        args: [--exclude, '\.terraform/.*']
```

## .gitattributes for Consistent Line Endings

```ini
# .gitattributes
# Normalize line endings in git
*.tf    text eol=lf
*.tofu  text eol=lf
*.tfvars text eol=lf
*.hcl   text eol=lf
*.yml   text eol=lf
*.yaml  text eol=lf
*.json  text eol=lf
*.sh    text eol=lf

# Binary files - no line ending conversion
*.png   binary
*.jpg   binary
*.gif   binary
*.ico   binary
*.zip   binary

# State files - don't mess with them
*.tfstate binary
*.tfstate.backup binary
```

## Conclusion

EditorConfig works silently in the background to ensure consistent code style across team members using different editors. The key settings for OpenTofu are 2-space indentation (matching `tofu fmt`), UTF-8 encoding, and LF line endings as the idiomatic convention, even though OpenTofu also accepts CRLF. Pair it with `tofu fmt` in pre-commit hooks - EditorConfig handles the settings inside the editor, while `tofu fmt` corrects formatting when code is committed.

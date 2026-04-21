# How to Generate Documentation for OpenTofu Modules with terraform-docs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, terraform-docs, Documentation, Module, Best Practice

Description: Learn how to use terraform-docs to automatically generate documentation for OpenTofu modules from variable and output definitions, keeping your module docs always up to date.

## Introduction

`terraform-docs` is an open-source tool that generates documentation from OpenTofu and Terraform module configurations. It reads your `variables.tf`, `outputs.tf`, and other files to produce formatted Markdown, JSON, or other documentation formats automatically.

## Installing terraform-docs

On macOS:

```bash
brew install terraform-docs
```

On Linux:

```bash
curl -sSLo ./terraform-docs.tar.gz https://github.com/terraform-docs/terraform-docs/releases/download/v0.22.0/terraform-docs-v0.22.0-linux-amd64.tar.gz
tar -xzf terraform-docs.tar.gz
chmod +x terraform-docs
sudo mv terraform-docs /usr/local/bin/
```

## Basic Usage

Generate Markdown documentation for a module:

```bash
terraform-docs markdown ./modules/networking
```

## Generating a README.md

Write documentation directly to a README file:

```bash
terraform-docs markdown table ./modules/networking > ./modules/networking/README.md
```

## Configuration File

Create a `.terraform-docs.yml` in your module directory:

```yaml
formatter: "markdown table"

sections:
  show:
    - header
    - requirements
    - providers
    - modules
    - resources
    - inputs
    - outputs

output:
  file: README.md
  mode: inject
  template: |-
    <!-- BEGIN_TF_DOCS -->
    {{ .Content }}
    <!-- END_TF_DOCS -->

sort:
  enabled: true
  by: name
```

Run with the config file:

```bash
terraform-docs .
```

## Injecting Docs into an Existing README

Add markers to your README:

```markdown
# My Module

Some manual documentation here.

<!-- BEGIN_TF_DOCS -->
<!-- END_TF_DOCS -->
```

Then run:

```bash
terraform-docs markdown table --output-file README.md --output-mode inject .
```

The section between the markers is automatically updated.

## Pre-commit Hook Integration

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/terraform-docs/terraform-docs
    rev: "v0.22.0"
    hooks:
      - id: terraform-docs-go
        args: ["markdown", "table", "--output-file", "README.md", "--output-mode", "inject", "./modules/networking"]
```

## CI/CD Integration

```yaml
- name: Generate module docs
  run: |
    terraform-docs markdown table ./modules/networking \
      --output-file README.md \
      --output-mode inject
```

## Conclusion

`terraform-docs` eliminates the manual effort of keeping module documentation current. By integrating it into pre-commit hooks or CI/CD pipelines, your documentation automatically reflects the latest variable and output definitions without any manual intervention.

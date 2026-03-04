# How to Use terraform-docs to Auto-Generate Module Documentation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Documentation, terraform-docs, DevOps

Description: Learn how to install and configure terraform-docs to automatically generate README documentation for your Terraform modules, including pre-commit hooks and CI integration.

---

Keeping Terraform module documentation in sync with code is a losing battle if you do it by hand. Every time you add a variable, rename an output, or change a default value, you have to remember to update the README. In practice, nobody remembers every time, and the docs drift.

terraform-docs solves this by reading your `.tf` files and generating formatted documentation automatically. It extracts variable names, types, defaults, descriptions, outputs, providers, and requirements, then injects them into your README.

## Installing terraform-docs

On macOS:

```bash
# Install via Homebrew
brew install terraform-docs
```

On Linux:

```bash
# Download the latest release
curl -Lo ./terraform-docs.tar.gz https://github.com/terraform-docs/terraform-docs/releases/download/v0.18.0/terraform-docs-v0.18.0-linux-amd64.tar.gz

# Extract and install
tar -xzf terraform-docs.tar.gz
chmod +x terraform-docs
sudo mv terraform-docs /usr/local/bin/
```

Verify the installation:

```bash
terraform-docs --version
```

## Basic Usage

Run terraform-docs against a module directory to see what it generates:

```bash
# Generate markdown table format (default)
terraform-docs markdown table ./modules/vpc

# Generate markdown document format
terraform-docs markdown document ./modules/vpc

# Output to stdout
terraform-docs markdown ./modules/vpc
```

This prints the generated documentation to stdout. To write it into your README, use the injection mode.

## Injecting into README

The most common workflow is to have terraform-docs inject generated content into specific sections of your README. First, add markers to your README.md:

```markdown
# My Terraform Module

This module creates a VPC with public and private subnets.

## Usage

```hcl
module "vpc" {
  source = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
}
```bash

<!-- BEGIN_TF_DOCS -->
<!-- END_TF_DOCS -->
```text

Then run:

```bash
# Inject documentation between the markers
terraform-docs markdown table --output-file README.md --output-mode inject ./modules/vpc
```

terraform-docs will read your `.tf` files and replace everything between `BEGIN_TF_DOCS` and `END_TF_DOCS` with the generated content. Your hand-written sections above the markers remain untouched.

## Configuration File

For consistent output across your team, create a `.terraform-docs.yml` configuration file in each module directory (or at the repo root):

```yaml
# .terraform-docs.yml
formatter: markdown table

# Control which sections appear
sections:
  show:
    - requirements
    - providers
    - inputs
    - outputs
    - resources

# Content to add before and after the generated sections
content: |-
  {{ .Requirements }}

  {{ .Providers }}

  {{ .Resources }}

  {{ .Inputs }}

  {{ .Outputs }}

# Output settings
output:
  file: README.md
  mode: inject
  template: |-
    <!-- BEGIN_TF_DOCS -->
    {{ .Content }}
    <!-- END_TF_DOCS -->

# Sort inputs and outputs alphabetically
sort:
  enabled: true
  by: name

# Settings for how inputs and outputs are displayed
settings:
  anchor: true
  color: true
  default: true
  description: true
  escape: true
  hide-empty: false
  html: true
  indent: 2
  lockfile: false
  read-comments: true
  required: true
  sensitive: true
  type: true
```

With this file in place, just run:

```bash
terraform-docs ./modules/vpc
```

It picks up the configuration automatically.

## Generated Output Example

Given these Terraform files:

```hcl
# variables.tf
variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

variable "enable_nat_gateway" {
  description = "Whether to create NAT gateways"
  type        = bool
  default     = true
}
```

terraform-docs generates:

```markdown
## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5 |
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| cidr_block | CIDR block for the VPC | `string` | n/a | yes |
| enable_nat_gateway | Whether to create NAT gateways | `bool` | `true` | no |
| environment | Environment name | `string` | `"dev"` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | The ID of the VPC |
| public_subnet_ids | List of public subnet IDs |
| private_subnet_ids | List of private subnet IDs |
```

## Pre-commit Hook

The best way to ensure documentation stays current is to run terraform-docs automatically on every commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/terraform-docs/terraform-docs
    rev: v0.18.0
    hooks:
      - id: terraform-docs-go
        args: ["markdown", "table", "--output-file", "README.md", "--output-mode", "inject"]
```

Install the pre-commit framework and set it up:

```bash
# Install pre-commit
pip install pre-commit

# Install the hooks
pre-commit install

# Run against all files once
pre-commit run --all-files
```

Now every time you commit changes to a module, the README is automatically updated.

## CI Pipeline Integration

Add terraform-docs to your CI pipeline to catch cases where someone forgets to run it:

```yaml
# .github/workflows/docs.yml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  terraform-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}

      - name: Render terraform-docs
        uses: terraform-docs/gh-actions@v1
        with:
          working-dir: modules
          recursive: true
          recursive-path: .
          output-file: README.md
          output-method: inject
          git-push: false

      - name: Check for changes
        run: |
          # If terraform-docs made changes, the README was out of date
          if [[ -n $(git diff --name-only) ]]; then
            echo "README is out of date. Run terraform-docs to update it."
            git diff
            exit 1
          fi
```

This workflow runs terraform-docs and fails if the generated output differs from what is committed. It forces developers to keep docs up to date.

## Running Across All Modules

If you have many modules in a monorepo, you can run terraform-docs across all of them:

```bash
# Find all module directories and run terraform-docs on each
for dir in modules/*/; do
  echo "Generating docs for $dir"
  terraform-docs markdown table --output-file README.md --output-mode inject "$dir"
done
```

Or use the recursive mode:

```bash
terraform-docs markdown table --recursive --recursive-path modules --output-file README.md --output-mode inject .
```

## Custom Templates

terraform-docs supports Go templates for custom output formats. If the default markdown table does not fit your needs:

```yaml
# .terraform-docs.yml
content: |-
  # {{ .Name }}

  {{ .Description }}

  ## Quick Start

  ```hcl
  module "example" {
    source = "{{ .Module.Source }}"
    {{ range .Module.Inputs }}
    {{ .Name }} = {{ if .Default }}{{ .Default }}{{ else }}"<required>"{{ end }}
    {{ end }}
  }
  ```bash

  {{ .Inputs }}

  {{ .Outputs }}
```text

This generates a pre-filled usage example from the module's variables, which is extremely helpful for users.

## Tips

A few things to keep in mind. Always write good `description` fields in your variables and outputs, because terraform-docs pulls directly from them. If your descriptions are empty, the generated table will be empty too.

Mark sensitive outputs with `sensitive = true` - terraform-docs will flag these in the generated documentation so users know which values are redacted in Terraform output.

For more on the manual side of documentation, see [how to document Terraform modules with README](https://oneuptime.com/blog/post/2026-02-23-document-terraform-modules-with-readme/view).

```bash
```

# How to Format Terraform Code with terraform fmt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Formatting, terraform fmt, Code Style, DevOps, Infrastructure as Code

Description: Learn how to use terraform fmt to automatically format your Terraform code for consistency including recursive formatting, CI/CD integration, and editor setup.

---

Consistent code formatting is one of those things that matters more than people think. When everyone on a team formats Terraform code differently - different indentation, different alignment, different spacing - code reviews become harder and diffs become noisy. `terraform fmt` solves this by enforcing a canonical format across all your Terraform files.

The best part? It is opinionated and automatic. There is nothing to configure. Run it, and your files are formatted according to the official Terraform style.

## Basic Usage

```bash
# Format all .tf files in the current directory
terraform fmt
```

When you run `terraform fmt`, it rewrites `.tf` files in place to match the canonical format. It prints the names of files it changed:

```
main.tf
variables.tf
```

If no files need formatting, there is no output.

## What terraform fmt Does

The formatter applies these rules:

- **Indentation** - Uses 2 spaces (not tabs)
- **Alignment** - Aligns `=` signs in argument blocks
- **Spacing** - Normalizes spacing around operators and in expressions
- **Newlines** - Adds consistent blank lines between blocks
- **Trailing whitespace** - Removes trailing spaces on lines
- **Attribute ordering** - Does not reorder attributes (that is left to you)

### Before Formatting

```hcl
resource "aws_instance" "web" {
    ami = "ami-abc123"
  instance_type="t3.micro"
  tags={
    Name="web-server"
      Environment = "production"
  }
}
```

### After Formatting

```hcl
resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

Notice how the `=` signs are aligned, indentation is consistent at 2 spaces, and spacing is normalized.

## Recursive Formatting

By default, `terraform fmt` only formats files in the current directory. To format all `.tf` files in all subdirectories:

```bash
# Format all .tf files recursively
terraform fmt -recursive
```

This is useful for monorepos with multiple Terraform configurations in different directories.

## Check Mode (Without Modifying Files)

To check if files need formatting without actually changing them:

```bash
# Check if files are properly formatted (exit code 0 = all good, 3 = needs formatting)
terraform fmt -check
```

This is the mode you want for CI/CD pipelines. It exits with code 0 if everything is formatted, or code 3 if any file needs formatting.

Combine with recursive:

```bash
# Check all files recursively
terraform fmt -check -recursive
```

## Diff Mode

To see what changes would be made without applying them:

```bash
# Show the diff of what would change
terraform fmt -diff
```

Output:

```diff
--- main.tf
+++ main.tf
@@ -1,5 +1,5 @@
 resource "aws_instance" "web" {
-    ami = "ami-abc123"
+  ami           = "ami-abc123"
   instance_type = "t3.micro"
 }
```

You can combine `-check` and `-diff` for CI/CD to both fail on unformatted code and show what needs to change:

```bash
# Show diffs and fail if anything needs formatting
terraform fmt -check -diff -recursive
```

## Formatting Specific Files

You can format a specific file or directory:

```bash
# Format a specific file
terraform fmt main.tf

# Format a specific directory
terraform fmt ./modules/networking/
```

## List Mode

To just list files that would be changed:

```bash
# List files that need formatting (without changing them)
terraform fmt -list=true -write=false
```

## Integrating with Editors

### VS Code

With the HashiCorp Terraform extension, formatting happens automatically on save:

```json
{
  "[terraform]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "hashicorp.terraform"
  }
}
```

### Vim

Add to your `.vimrc`:

```vim
" Auto-format Terraform files on save
autocmd BufWritePre *.tf silent! execute '!terraform fmt %'
autocmd BufWritePre *.tf edit
```

Or use a plugin like vim-terraform:

```vim
" With vim-plug
Plug 'hashivim/vim-terraform'

" Enable auto-format on save
let g:terraform_fmt_on_save = 1
```

### Neovim with LSP

If you use Neovim with terraform-ls:

```lua
-- In your LSP configuration
require('lspconfig').terraformls.setup{
  on_attach = function(client, bufnr)
    -- Format on save
    vim.api.nvim_create_autocmd("BufWritePre", {
      buffer = bufnr,
      callback = function()
        vim.lsp.buf.format()
      end,
    })
  end,
}
```

### JetBrains IDEs (IntelliJ, GoLand)

Install the "Terraform and HCL" plugin from JetBrains, then enable format on save in Settings > Tools > Terraform.

## CI/CD Integration

### GitHub Actions

```yaml
name: Terraform Format Check
on: [pull_request]

jobs:
  fmt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Format Check
        run: terraform fmt -check -recursive -diff

      - name: Comment on PR if formatting fails
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Terraform formatting check failed. Please run `terraform fmt -recursive` and commit the changes.'
            })
```

### GitLab CI

```yaml
fmt-check:
  stage: lint
  image: hashicorp/terraform:1.7.5
  script:
    - terraform fmt -check -recursive -diff
  only:
    - merge_requests
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Format Terraform files
terraform fmt -recursive

# Stage any reformatted files
git diff --name-only | grep '\.tf$' | xargs -r git add

# Check if there are any formatting changes that were not staged
if ! terraform fmt -check -recursive > /dev/null 2>&1; then
    echo "Terraform files were reformatted. Changes have been staged."
    echo "Please review and commit again."
    exit 1
fi
```

Or use the popular pre-commit framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.86.0
    hooks:
      - id: terraform_fmt
```

## Formatting .tfvars Files

`terraform fmt` also formats `.tfvars` files:

```bash
# Format all .tf and .tfvars files
terraform fmt
```

Before:

```hcl
# terraform.tfvars
instance_type = "t3.micro"
environment="production"
region = "us-east-1"
```

After:

```hcl
# terraform.tfvars
instance_type = "t3.micro"
environment   = "production"
region        = "us-east-1"
```

## What terraform fmt Does NOT Do

The formatter has intentional limitations:

- **Does not reorder arguments** - The order of attributes within a block is preserved
- **Does not reorder blocks** - The order of resource blocks in a file stays the same
- **Does not add comments** - No automatic documentation
- **Does not fix logic errors** - Formatting only, not validation
- **Does not handle non-HCL files** - JSON configurations (`.tf.json`) are not formatted

For additional style enforcement beyond what `terraform fmt` provides, consider tflint:

```bash
# Install tflint
brew install tflint

# Run tflint for additional checks
tflint --init
tflint
```

## Formatting JSON Configuration Files

If you use JSON-format Terraform files (`.tf.json`), `terraform fmt` does not format them. Use `jq` or `python -m json.tool` instead:

```bash
# Format JSON Terraform files with jq
jq '.' main.tf.json > main.tf.json.tmp && mv main.tf.json.tmp main.tf.json
```

## Team Workflow

For teams, the workflow should be:

1. **Set up format-on-save in editors** so formatting happens automatically
2. **Add a pre-commit hook** as a safety net for developers who do not use format-on-save
3. **Run format check in CI/CD** as the final enforcement

This three-layer approach means unformatted code never makes it into your main branch.

```bash
# The typical developer workflow
# 1. Edit files (auto-formatted on save by editor)
# 2. Commit (pre-commit hook catches anything the editor missed)
# 3. Push (CI/CD verifies formatting as part of the PR check)
```

## Conclusion

`terraform fmt` eliminates formatting debates and inconsistency. Run it, configure format-on-save in your editor, and enforce it in CI/CD. Your codebase stays clean, diffs stay readable, and code reviews focus on logic instead of whitespace. It is one of the simplest Terraform commands, but one of the most impactful for team productivity.

# Validation Summary: How to Format Terraform Code with terraform fmt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI (`terraform fmt`)
- HCL (HashiCorp Configuration Language)
- VS Code (HashiCorp Terraform extension)
- Vim / Neovim (vim-terraform plugin, terraform-ls LSP via nvim-lspconfig)
- JetBrains IDEs (Terraform plugin)
- GitHub Actions (`hashicorp/setup-terraform@v3`, `actions/checkout@v4`, `actions/github-script@v7`)
- GitLab CI (`hashicorp/terraform` Docker image)
- pre-commit framework (`antonbabenko/pre-commit-terraform`)
- tflint
- jq

## Sources Consulted
- Official `terraform fmt` documentation: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform style conventions: https://developer.hashicorp.com/terraform/language/syntax/style
- Terraform source code (`internal/command/fmt.go`) for confirmed file-extension support and exit codes
- pre-commit-terraform releases: https://github.com/antonbabenko/pre-commit-terraform/releases
- Vim documentation on `BufWritePre` vs `BufWritePost` autocommand events

## Issues Found

1. **Vim autocmd used wrong event (`BufWritePre`).** The original example used `BufWritePre *.tf` to run `!terraform fmt %` and then `edit`. Because `BufWritePre` fires *before* Vim writes the buffer to disk, `terraform fmt %` would format the *previous* on-disk version of the file, and the subsequent `edit` would reload that old (formatted) content, discarding the user's in-buffer edits. Changed both lines to `BufWritePost` so the file is written first, then formatted on disk, then reloaded into the buffer — which is the standard and safe pattern.

2. **Pre-commit hook logic was unreachable.** The original script ran `terraform fmt -recursive`, staged the reformatted files, and only then ran `terraform fmt -check -recursive` to decide whether to print a warning and `exit 1`. Since the check runs *after* the format step, it would essentially always pass, so the warning message and abort would never fire and the user would silently commit reformatted files. Restructured the script so the check runs first; only if files need formatting does it then format, stage, print the warning, and `exit 1` — giving the developer a chance to review.

## Review Notes

- Verified that `terraform fmt -check` returns exit code 3 (not just generic non-zero) when files need formatting — matches the post's claim.
- Verified `terraform fmt` formats `.tf` and `.tfvars` files but does **not** touch `.tf.json` / `.tfvars.json` (per official help text and source code) — matches the post.
- `terraform fmt -list=true -write=false` works as described, though `-list=true` is the default so it is redundant; left as-is since it is still correct and arguably clearer.
- JetBrains plugin: the post calls it the "Terraform and HCL" plugin, which was its earlier name; HashiCorp now publishes it as "HashiCorp Terraform". Both names map to the same/successor plugin on JetBrains Marketplace, so the instruction is still recognizable. Not changed.
- The "After Formatting" example shows the `tags = {` block separated from the alignment group of preceding single-line attributes. Real `terraform fmt` output groups consecutive single-line `=` assignments together and starts a new alignment group at multi-line constructs, which matches what the post shows.
- `pre-commit-terraform` `v1.86.0` is a valid historical release tag (the project is currently at v1.105.0 as of January 2026). Pinning to an older known-good tag is reasonable, so this was left unchanged.
- The Docker image `hashicorp/terraform:1.7.5` in the GitLab example is a specific older tag; teams may want to bump this in their own pipelines, but it is a valid image and not technically wrong.

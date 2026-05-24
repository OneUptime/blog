# Validation Summary: How to Handle Merge Conflicts in Terraform Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Git (merge, diff, log, revert, checkout)
- GitHub CODEOWNERS
- terraform-aws-modules/vpc/aws module
- AWS (aws_instance, RDS instance classes used in examples)
- GitHub Actions / CI YAML

## Sources Consulted
- `git diff --help` (verified three-dot vs two-dot syntax semantics)
- Git documentation on `git diff A...B` — equivalent to `git diff $(git merge-base A B) B`
- Terraform CLI documentation for `terraform fmt`, `terraform validate`, `terraform init -backend=false`, `terraform plan` (https://developer.hashicorp.com/terraform/cli/commands)
- Git documentation for `git revert -m <parent-number>` for reverting merge commits (https://git-scm.com/docs/git-revert)
- Git documentation for `git merge --no-commit --no-ff` and `git merge --abort`
- terraform-aws-modules/vpc/aws registry (https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest) — versions 5.2.0 / 5.3.0 are plausible 5.x release numbers
- GitHub CODEOWNERS documentation (path-based ownership in `.github/CODEOWNERS`)

## Issues Found
1. **Missing `###` heading marker on "Resource Block Conflicts" (line 23).** The other two subsections under "Common Conflict Patterns" use `###`, but this one was plain text. Fixed by prepending `### `.
2. **Incorrect `git diff` direction (line 109).** The example used `git diff HEAD...main -- path/to/file.tf` with the comment "See what the current branch changed." However, per the official `git diff` docs, `git diff A...B` is equivalent to `git diff $(git merge-base A B) B`, so `git diff HEAD...main` shows what *main* changed since the common ancestor — the opposite of the comment's intent. Corrected to `git diff main...HEAD -- path/to/file.tf`.

## Review Notes
- The `terraform fmt` command accepts both directories and individual file paths, so `terraform fmt path/to/file.tf` is valid.
- The `git log --oneline feature-branch --not main -- path/to/file.tf` form is a valid revision range expression equivalent to `feature-branch ^main`.
- The example AMI ID (`ami-0c55b159cbfafe1f0`) is a well-known example value used in HashiCorp documentation; appropriate for illustrative purposes.
- The CI snippet aborts the trial merge in both success and failure paths, which is correct behavior for a "detect-only" check.
- The `git revert -m 1 <merge-commit-sha>` example is correct for reverting a merge commit relative to its first parent (mainline).
- The advice in "Recovery from Bad Resolutions" to run `terraform apply` after a `git revert` is reasonable but the post could (in a future revision) emphasize more strongly that the revert plan should be reviewed for destructive operations (e.g., resources that were created on the bad branch will be destroyed by the revert). This isn't a technical error — just a hardening opportunity.

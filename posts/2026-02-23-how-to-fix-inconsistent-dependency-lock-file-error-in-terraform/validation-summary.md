# Validation Summary: How to Fix Inconsistent Dependency Lock File Error in Terraform

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (CLI: `terraform init`, `terraform providers lock`)
- `.terraform.lock.hcl` dependency lock file
- HCL configuration syntax
- Bash scripting
- GitHub Actions / CI workflows
- Git / `.gitignore`

## Sources Consulted
- HashiCorp Terraform docs — `terraform init`: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform docs — `terraform providers lock`: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- HashiCorp Terraform docs — Dependency Lock File: https://developer.hashicorp.com/terraform/language/files/dependency-lock

## Issues Found
No technical issues found.

Verifications performed:
- `terraform init -upgrade` — confirmed valid flag; correctly described as updating the lock file to the newest version satisfying constraints.
- `terraform init -lockfile=readonly` — confirmed valid flag; correctly described as failing init when the lock file would need to change. The doc note that `-lockfile=readonly` conflicts with `-upgrade` is consistent with the post's separation of CI vs local workflows.
- `terraform providers lock -platform=...` — confirmed; the docs explicitly show multiple `-platform` flags and use `linux_amd64`, `darwin_amd64`, `windows_amd64` as examples. `darwin_arm64` follows the same `<os>_<arch>` pattern and is a valid identifier (Apple Silicon).
- `.terraform.lock.hcl` structure (provider block with `version`, `constraints`, `hashes` array containing `h1:` and `zh:` prefixed hashes) — matches the documented format.
- Error message wording — the quoted error messages are paraphrased but faithful to the actual Terraform output (e.g. "locked version selection ... doesn't match the updated version constraints", and the checksum mismatch variant).
- `.gitignore` patterns (`.terraform/`, `*.tfstate*`, `*.tfvars`, with `!.terraform.lock.hcl` re-include) — match HashiCorp's recommended pattern.

## Review Notes
- The "Warning: Unused provider lock" snippet is a reasonable paraphrase rather than a verbatim Terraform message — modern `terraform init` typically just silently removes unused provider entries from the lock file on re-init. The fix advice (delete and regenerate, or simply re-init) is still correct.
- The `rm -rf .terraform/providers` step works, though `rm -rf .terraform` is the more commonly recommended full reset. Both are acceptable.
- The `grep "h1:" .terraform.lock.hcl | wc -l` verification command is a quick sanity check; note that "h1:" hashes are the registry-supplied package hashes, while "zh:" are zip hashes — both kinds appear in a properly populated lock file, and counting only `h1:` lines gives a reasonable proxy for platform coverage.
- The post correctly notes that `-lockfile=readonly` is the right CI guard. This flag has been available since Terraform 0.14 when the lock file feature was introduced and remains current.
- No version-specific caveats — guidance applies to Terraform 0.14 and later (including current 1.x releases).

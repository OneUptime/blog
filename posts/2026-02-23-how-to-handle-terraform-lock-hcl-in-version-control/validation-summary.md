# Validation Summary: How to Handle .terraform.lock.hcl in Version Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform dependency lock file (`.terraform.lock.hcl`)
- Terraform provider version constraints
- Git version control
- Git custom merge drivers
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform `providers lock` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Git `gitattributes` documentation for custom merge driver placeholders: https://git-scm.com/docs/gitattributes
- Git `gitignore` documentation: https://git-scm.com/docs/gitignore

## Issues Found
- The post said missing multi-platform hashes would cause hash verification failures for team members on other operating systems. HashiCorp documents that signed provider checksums usually cover other platforms, while Terraform may later add missing platform-specific `h1:` hashes; hard failures are more likely with mirrors or providers that cannot supply signed checksums for all platforms. Updated the wording to reflect those conditions.
- The custom Git merge driver was described as taking the latest provider version. Git's `%B` placeholder is the other branch's version, and `terraform providers lock` refreshes lock information but does not perform a provider upgrade. Updated the wording to say it takes the incoming version and refreshes checksums.
- The troubleshooting section said unconstrained provider versions make the lock file change on every `terraform init`. Terraform reuses versions already selected in the lock file unless `-upgrade` is used or a new selection is needed. Updated the wording and code comment to avoid implying plain `terraform init` ignores the lock file.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The GitHub Actions example is technically valid for a single root module; mono-repos with nested root modules would need adjusted paths and per-module execution.

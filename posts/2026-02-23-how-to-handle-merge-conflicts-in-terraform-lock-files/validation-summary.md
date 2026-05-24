# Validation Summary: How to Handle Merge Conflicts in Terraform Lock Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, `.terraform.lock.hcl` dependency lock file)
- Terraform providers (hashicorp/aws, hashicorp/random)
- Git (merge conflict resolution, `git checkout --ours`/`--theirs`, `.gitattributes` merge drivers)
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`)
- GitHub CLI (`gh pr create`)
- Make

## Sources Consulted
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- `terraform providers lock` command: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- `terraform init` command: https://developer.hashicorp.com/terraform/cli/commands/init
- Git `gitattributes` documentation (built-in and custom merge drivers): https://git-scm.com/docs/gitattributes
- Git `checkout --ours`/`--theirs` semantics: https://git-scm.com/docs/git-checkout
- `actions/checkout` v4: https://github.com/actions/checkout
- `hashicorp/setup-terraform` v3: https://github.com/hashicorp/setup-terraform

## Issues Found
1. **`.gitattributes` `merge=ours` example was incomplete** — The post instructed readers to add `.terraform.lock.hcl merge=ours` to `.gitattributes` and described it as if it would work out of the box. Git has no built-in `ours` merge driver (only `text`, `binary`, and `union` are built in). Without first defining a custom merge driver in Git config (e.g., `git config merge.ours.driver true`), the attribute has no effect and Git falls back to normal merging. I added a preceding `git config` command and an explanatory sentence so the example actually works as described.

## Review Notes
- The illustrative `"zh:darwin_amd64_hash..."` style strings in the "Different Platforms" section are pseudocode; real `zh:` hashes are 64-char hex SHA256 digests with no platform identifier embedded in the string. The intent is clear from context, so I left it as-is.
- Hash format examples elsewhere (44-char base64 `h1:` and 64-char hex `zh:`) match Terraform's actual lock file format.
- The "New Provider Additions" cause is the weakest of the three explanations — purely additive provider blocks normally merge cleanly. The qualifier ("if `terraform init` also refreshed their hashes") makes the claim technically defensible, so I left it.
- GitHub Actions versions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`) and the example Terraform version (1.7.0) are valid and current as of the publication date.
- All CLI commands and flags (`terraform init -upgrade`, `terraform providers lock -platform=...`, `git checkout --ours`/`--theirs`) are correct.

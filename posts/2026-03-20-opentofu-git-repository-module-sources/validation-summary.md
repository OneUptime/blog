# Validation Summary: How to Use Git Repository Module Sources in OpenTofu - Repository

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (module sources, `tofu init`)
- Terraform-compatible HCL syntax
- Git (HTTPS and SSH protocols, refs/tags/branches/commit SHAs)
- GitHub (used as example host)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu generic Git repository section: https://opentofu.org/docs/language/modules/sources/#generic-git-repository
- Git credentials storage reference: https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage

## Issues Found

1. **"plan time" vs. "init time"** — The post stated that OpenTofu clones the repository "at plan time". Per the official docs, modules are downloaded during `tofu init`, not during `plan`. Fixed by updating the sentence to "OpenTofu will clone the repository during `tofu init`". This is also internally consistent with the later "Using with tofu init" section.

2. **Incorrect HTTPS authentication guidance** — The post referenced `GIT_USERNAME` and `GIT_PASSWORD` environment variables, which are not standard Git or OpenTofu mechanisms. OpenTofu delegates authentication to Git itself, which uses credential helpers (e.g., `credential.helper store`), `.netrc`, or credentials embedded in the URL. Replaced the comment block with accurate guidance pointing at Git credential helpers and a corrected token-in-URL example using the `oauth2:<token>` form (the standard format for GitHub personal access tokens over HTTPS).

## Review Notes
- The example commit SHA in the "Pinning to a Specific Commit" section is an abbreviated 12-character hash. While abbreviated SHAs work for `git checkout`, full 40-character SHAs are stronger for "maximum reproducibility" since abbreviated SHAs can become ambiguous as a repo grows. Left as-is since it is a stylistic recommendation rather than a technical error.
- The note "Git sources do not use OpenTofu's lock file (`tofu providers lock`)" is technically accurate — the lock file applies to providers only, not modules — though phrasing it this way might suggest a relationship that does not exist. Left as-is since the underlying fact is correct.
- `tofu init -upgrade` is a valid flag and behaves as described (re-checks module sources and upgrades providers).

# Validation Summary: Using GitHub as a Module Source in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (module sources)
- Terraform (module source compatibility)
- HCL (module block syntax)
- Git (clone protocols, credential helpers, `insteadOf` rewrites)
- GitHub (HTTPS auth via personal access token, SSH auth)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- terraform-aws-modules/terraform-aws-vpc repository (tag v5.5.0): https://github.com/terraform-aws-modules/terraform-aws-vpc/tree/v5.5.0
- terraform-aws-modules/terraform-aws-vpc release page for v5.5.0: https://github.com/terraform-aws-modules/terraform-aws-vpc/releases/tag/v5.5.0
- Git documentation on `url.<base>.insteadOf` configuration: https://git-scm.com/docs/git-config

## Issues Found

1. **Incorrect SSH claim.** The original post stated `# github.com/myorg/... automatically uses SSH if configured`. The OpenTofu docs are explicit that the `github.com/` shorthand always clones over HTTPS; to use SSH you must use the explicit `git@github.com:owner/repo.git` form (or rely on a Git `insteadOf` rewrite, which operates transparently at the Git layer). Replaced the comment with a corrected explanation that points to the explicit `git@github.com:...` form.

2. **Wrong subpath in `terraform-aws-modules/terraform-aws-vpc` example.** The original post used `github.com/terraform-aws-modules/terraform-aws-vpc//modules/vpc?ref=v5.5.0` and called it the same module as the registry module `terraform-aws-modules/vpc/aws`. Verified against the v5.5.0 tag of that repository: the main VPC module lives at the repo root, and the `/modules/` directory at v5.5.0 only contains `vpc-endpoints` (there is no `/modules/vpc`). The given path would not resolve. Removed the `//modules/vpc` subpath so the source is `github.com/terraform-aws-modules/terraform-aws-vpc?ref=v5.5.0`, which correctly mirrors the registry module.

## Review Notes
- The `git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"` recipe is a standard pattern; `oauth2:<token>` is one of the accepted basic-auth pairings on GitHub (alongside `x-access-token:<token>` for GitHub App tokens). It works because OpenTofu invokes the system `git` binary for Git-protocol module sources and respects local Git config.
- The advice to always pin a `?ref=` tag for production is sound; without `ref` OpenTofu clones the default branch, which is not reproducible.
- The `ghp_` token prefix shown in the example is the legacy classic-PAT prefix. Fine-grained tokens use the `github_pat_` prefix. Both work with the same `oauth2:<token>` HTTPS pattern, so the example remains valid; future revisions could mention fine-grained tokens.
- For OpenTofu specifically, the `tofu` CLI supports the same Git source semantics as Terraform; nothing in the post is OpenTofu-specific syntax that would break under Terraform, which matches the post's framing.

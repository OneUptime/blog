# Validation Summary: How to Use Stacks with OpenTofu

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (with a factually incorrect premise and mislabeled content)

## Technologies Covered
- OpenTofu (referenced in title; basic CLI/HCL workflow shown in body)
- AWS S3 (state backend example)
- GitHub Actions (CI/CD example)
- HCL (basic syntax, locals, variable validation)

## Sources Consulted
- OpenTofu official docs ("What's new" pages and intro): https://opentofu.org/docs/intro/whats-new/
- OpenTofu releases page: https://github.com/opentofu/opentofu/releases
- OpenTofu blog (1.8.0 release announcement covering Early Variable Evaluation, Provider Mocking): https://opentofu.org/blog/opentofu-1-8-0/
- HashiCorp Terraform Stacks documentation (the feature the post conflates with OpenTofu): https://developer.hashicorp.com/terraform/language/stacks
- OpenTofu vs. Terraform comparison articles (April 2026) for current feature parity status

## Issues Found

This post should be removed from the blog. There are two compounding problems that cannot be addressed by a localized technical correction:

### 1. The premise is factually incorrect — OpenTofu does not have a "native Stacks feature"

The post's description and Step 1 framing claim:
> "Learn how to use OpenTofu's native Stacks feature for component-based infrastructure deployments with deferred evaluation."

As of April 2026 (and through the latest releases including OpenTofu 1.11 and the 1.12.0 beta), OpenTofu has **no native Stacks feature**. Stacks (with components, deployments, and deferred evaluation of unknown values) is a HashiCorp Terraform feature, distributed via HCP Terraform/Terraform Enterprise and configured with `*.tfstack.hcl` / `*.tfdeploy.hcl` files. OpenTofu has not implemented an equivalent. OpenTofu's analogous direction has been "Early Variable / Locals Evaluation" (1.8) and ephemeral resources (1.11) — different features that solve overlapping problems but are not "Stacks." Teaching readers that this feature exists in OpenTofu would actively misinform them.

### 2. The body of the post does not cover Stacks at all

Even setting aside the factual error, the body delivers none of the promised material. There is no mention of:
- `*.tfstack.hcl` or `*.tfdeploy.hcl` configuration files
- `component`, `deployment`, or `orchestrate` blocks
- Deferred evaluation of unknown values (`each.value` references across components)
- A `tofu stacks ...` (or equivalent) CLI subcommand
- Stack-level inputs/outputs vs. component-level inputs/outputs

Instead, Steps 1–6 are a generic OpenTofu tutorial covering: installing/verifying OpenTofu, an S3 + DynamoDB backend, `tofu init` / `plan` / `apply`, a GitHub Actions workflow, `tofu state list` / `state show`, and `locals` plus variable `validation` blocks. This same material is already covered (correctly and in greater depth) by many other posts in this blog (e.g., `2026-02-23-use-opentofu-with-s3-backend`, `2026-02-23-use-opentofu-with-github-actions`, `2026-02-23-use-opentofu-with-ci-cd-pipelines`, etc.). The conclusion's claim — "You have successfully implemented How to Use Stacks with OpenTofu" — is not supported by anything in the body.

### Why this is "not-technically-relevant" rather than a fixable post

A localized technical fix is not possible here:
- Correcting the premise would require deleting the title, description, introduction, and conclusion.
- Replacing the body with actual Stacks content is impossible because the feature does not exist in OpenTofu — there is nothing accurate to write about it.
- Rewriting the post to be about a different topic (e.g., Terragrunt-style modular composition, OpenTofu modules, or Terraform Stacks in HCP) would be a from-scratch authoring task, which is outside the scope of a technical review.

In addition to the two primary issues above, the body also contains some minor technical staleness that would need fixing if the post were kept (noted for completeness, not as the basis for the classification):
- `actions/upload-artifact@v3` and `actions/download-artifact@v3` (Step 4) are deprecated and were retired by GitHub in early 2025; v4 is the current stable version.
- The Apply job's `tofu init` followed by `tofu apply tfplan` requires the `.terraform/` directory state from the Plan job; in practice the saved binary plan should be paired with the lock/providers, otherwise `apply` may fail or re-resolve providers. This is a workflow-design issue, not pure CLI syntax.

## Review Notes

- Recommended action: remove the post, or replace it with a post about a topic OpenTofu actually supports (e.g., "Composing OpenTofu modules across environments," "Using Terragrunt with OpenTofu for stack-like layering," or "OpenTofu Early Variable Evaluation for multi-environment backends"). Each of these would deliver the spirit of what the title implies without making a false claim about OpenTofu.
- If the OpenTofu project later adds a Stacks-equivalent feature, this slot could be re-authored at that time against the then-current docs. As of the validation date there is nothing accurate to write.

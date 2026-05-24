# Validation Summary: How to Create GitHub Branch Protection Rules with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Configuration Language (HCL)
- GitHub Terraform provider (`integrations/github` ~> 6.0)
- GitHub branch protection rules
- GitHub tag protection rules

## Sources Consulted
- Terraform Registry — `integrations/github` provider documentation: https://registry.terraform.io/providers/integrations/github/latest/docs
- `github_branch_protection` resource: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection
- `github_repository` resource: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository
- `github_repository_tag_protection` resource: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_tag_protection
- GitHub REST API documentation for branch protection: https://docs.github.com/en/rest/branches/branch-protection
- GitHub documentation on repository rulesets and tag protection deprecation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets

## Issues Found
No technical issues found. The Terraform configuration is syntactically correct and uses the proper resource names, block structures, and argument names for the `integrations/github` v6.x provider:

- `github_branch_protection` correctly uses `repository_id` referencing `node_id` (required in v6).
- `required_pull_request_reviews` block correctly uses `required_approving_review_count`, `dismiss_stale_reviews`, `require_code_owner_reviews`, and `restrict_dismissals`.
- `required_status_checks` block correctly uses `strict` and `contexts`.
- Top-level fields `allows_force_pushes`, `allows_deletions`, `required_linear_history`, `enforce_admins`, and `require_signed_commits` are valid.
- The `for_each` patterns and conditional expressions are valid HCL.
- The `github_repository_tag_protection` resource arguments (`repository`, `pattern`) are correct.

## Review Notes
- The `contexts` argument inside `required_status_checks` is still supported in v6.x, but the provider also offers a newer `checks` argument that accepts entries in the form `"context:app_id"` to pin status checks to a specific GitHub App. For stricter security, future iterations of the post could mention `checks` as an alternative.
- GitHub has announced that tag protection rules are being superseded by repository rulesets (`github_repository_ruleset`). The `github_repository_tag_protection` resource still works against the existing API but readers should be aware that GitHub's long-term direction is rulesets, which can also cover branch and tag protection in a unified way.
- The `enforce_admins = each.value.min_reviews >= 2` expression is a clever but somewhat opaque conditional — works correctly but a brief comment in production code would aid readability. Not a technical error.
- The post assumes the GitHub token used has sufficient scopes (`repo` and `admin:org` for org-owned repos) to manage branch protection. This is correct but not explicitly stated; not an error since the focus is on Terraform configuration.

# Validation Summary: How to Create GitHub Repositories with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- Terraform GitHub provider (`integrations/github` ~> 6.0)
- GitHub repositories, teams, branches, and repository files
- HCL configuration language

## Sources Consulted
- Terraform GitHub provider repository docs: https://github.com/integrations/terraform-provider-github
- `github_repository` resource docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/docs/resources/repository.md
- Terraform Registry: https://registry.terraform.io/providers/integrations/github/latest/docs

## Issues Found
No technical issues found.

All resources, arguments, and exported attributes used in the post are valid for the `integrations/github` provider v6.x:
- `github_repository` with `name`, `description`, `visibility` (private/internal valid), `has_issues`, `has_projects`, `has_wiki`, `has_downloads`, `allow_merge_commit`, `allow_squash_merge`, `allow_rebase_merge`, `allow_auto_merge`, `delete_branch_on_merge`, `vulnerability_alerts`, `topics` — all confirmed in docs.
- `template` block with `owner`, `repository`, `include_all_branches` — confirmed.
- `github_branch_default` with `repository` and `branch` — valid.
- `github_repository_file` with `repository`, `branch`, `file`, `content`, `commit_message`, `overwrite_on_create` — valid.
- `github_team` with `name` and `privacy` ("closed" is a valid value) — valid.
- `github_team_repository` with `team_id`, `repository`, `permission` ("push" is a valid value) — valid.
- Exported attributes `html_url` and `ssh_clone_url` — confirmed.
- Dynamic blocks, `for_each`, and the `lifecycle.prevent_destroy` Terraform usage are syntactically correct.

## Review Notes
- The `vulnerability_alerts` argument on `github_repository` is currently marked as deprecated in the provider docs in favor of the separate `github_repository_vulnerability_alerts` resource. It still works and the post's usage is not incorrect today, but readers may eventually need to migrate when the provider removes it.
- Similarly, `has_downloads` is documented as a deprecated/no-longer-in-use field; it still accepts a value without error.
- The `github_team_repository` resource is being phased toward `github_team_repository_assignment` in some workflows, but both remain available in v6.x.
- The Terraform `>= 1.5.0` requirement and `~> 6.0` provider pin are reasonable and current as of the post's date.

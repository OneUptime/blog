# Validation Summary: How to Configure GitLab Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- GitLab Terraform provider
- GitLab groups and projects
- GitLab branch protection
- GitLab merge request approvals
- GitLab CI/CD variables
- GitLab deploy tokens and deploy keys
- GitLab project hooks

## Sources Consulted
- Terraform Registry: GitLab provider documentation - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs
- Terraform Registry: gitlab_project resource - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs/resources/project
- Terraform Registry: gitlab_group resource - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs/resources/group
- Terraform Registry: gitlab_branch_protection resource - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs/resources/branch_protection
- Terraform Registry: gitlab_project_level_mr_approvals resource - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs/resources/project_level_mr_approvals
- Terraform Registry: gitlab_project_approval_rule resource - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs/resources/project_approval_rule
- Terraform Registry: gitlab_deploy_key resource - https://registry.terraform.io/providers/gitlabhq/gitlab/latest/docs/resources/deploy_key
- GitLab Docs: Deploy keys - https://docs.gitlab.com/user/project/deploy_keys/
- GitLab Docs: Deploy keys API - https://docs.gitlab.com/api/deploy_keys/
- GitLab Docs: Projects API - https://docs.gitlab.com/api/projects/

## Issues Found
- Updated the provider version constraint from `~> 17.0` to `~> 19.0` so the tutorial targets the current major provider line available at validation time.
- Added trailing slashes to `base_url` examples because the GitLab provider documents `base_url` as a GitLab API endpoint that must end with a slash.
- Replaced deprecated `gitlab_project` feature toggles (`issues_enabled`, `merge_requests_enabled`, `wiki_enabled`, `snippets_enabled`, and `container_registry_enabled`) with their current `*_access_level` equivalents.
- Clarified that top-level group creation with `gitlab_group` applies to self-managed GitLab; GitLab.com top-level groups must be created outside Terraform and imported.
- Expanded the `project_creation_level` comment to include all documented valid values.
- Changed the security approval rule example to use a `gitlab_group` data source instead of referencing an undefined `gitlab_group.security` resource, and removed the incorrect implication that `gitlab_project_approval_rule` is path-scoped.
- Corrected the protected CI/CD variable comment to mention protected tags as well as protected branches.
- Updated the membership access-level comment to include all currently documented provider values.
- Reworked the shared deploy key example to create one `gitlab_deploy_key` and attach it to another project with `gitlab_deploy_key_enable`, matching the provider documentation.

## Review Notes
- Terraform CLI validation could not be run because `terraform` is not installed in the review environment.
- Some GitLab approval and code owner features require Premium, Ultimate, or Enterprise capabilities depending on the GitLab deployment.

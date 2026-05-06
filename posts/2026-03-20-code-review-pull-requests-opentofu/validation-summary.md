# Validation Summary: How to Set Up Code Review for OpenTofu Pull Requests

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI (`tofu fmt`, `tofu validate`, `tofu plan`)
- GitHub Actions
- `opentofu/setup-opentofu`
- `actions/github-script`
- GitHub branch protection and CODEOWNERS
- Terraform GitHub provider (`integrations/github`)
- Pull request templates

## Sources Consulted
- OpenTofu Files and Directories: https://opentofu.org/docs/language/files/
- OpenTofu JSON Configuration Syntax: https://opentofu.org/docs/language/syntax/json/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `validate` command: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu `fmt` command: https://opentofu.org/docs/v1.8/cli/commands/fmt/
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `actions/github-script` README: https://github.com/actions/github-script
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub pull request template documentation: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
- Terraform Registry `github_branch_protection` resource: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection
- Terraform Registry `github_repository_file` resource: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_file

## Issues Found
- The workflow path filter only matched `.tf`, `.tfvars`, and `.hcl`, which misses current OpenTofu file types such as `.tofu`, `.tf.json`, `.tofu.json`, and `.tfvars.json`. I expanded the workflow filter and the CODEOWNERS example so review automation covers the documented OpenTofu file set.
- The branch protection example required `"OpenTofu Plan / plan"` and `"OpenTofu Validate / validate"`, but the workflow defines a single job. GitHub branch protection works with job-level status checks rather than individual steps, so those contexts would not line up with the workflow. I added an explicit job name and changed the required status check to `"OpenTofu Plan"`.
- The `dismissal_restrictions` example used `"/infrastructure-team"`, which is not the documented team actor format for the GitHub provider. I changed it to `"myorg/infrastructure-team"`, which matches the provider's `org/team` format.
- The `actions/github-script` example read a GitHub Actions expression directly inside the script body and did not await `createComment`. I changed the path handoff to an environment variable and awaited the API call so the example matches the action's documented usage pattern more closely.
- The post said to post the "full" plan output as a PR comment, but the official OpenTofu action docs call out GitHub's comment-size limit. I updated the best-practices note to reflect truncation or a workflow summary for large plans.
- The workflow used `opentofu/setup-opentofu@v1` even though the current official usage examples use `@v2`. I updated the example to `@v2`.

## Review Notes
- The example still pins `tofu_version: "1.6.0"`. That is valid syntax, but it is an older OpenTofu release pin rather than a current-version example.
- GitHub's CODEOWNERS docs note that protecting the `CODEOWNERS` file itself requires assigning an owner to `.github/CODEOWNERS` or the `.github/` directory. The post is technically correct without that addition, but it would strengthen the protection model if added later.

# Validation Summary: How to Switch Between Workspaces in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- OpenTofu CLI workspaces
- OpenTofu/Terraform HCL
- AWS provider `aws_db_instance`
- GitHub Actions
- Infrastructure as Code workflows

## Sources Consulted
- OpenTofu `workspace select` command documentation: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu CLI workspace documentation: https://opentofu.org/docs/cli/workspaces/
- OpenTofu language workspace documentation: https://opentofu.org/docs/language/state/workspaces/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- OpenTofu setup action documentation: https://github.com/opentofu/setup-opentofu
- GitHub checkout action documentation: https://github.com/actions/checkout
- AWS provider `aws_db_instance` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown

## Issues Found
- The introduction described each workspace as using a separate "state file." OpenTofu documentation describes workspaces as separate state data in the backend, and only local backends store workspace state as local files. Changed "state file" to "state data."
- The `aws_db_instance` example used EC2-style instance type values (`t3.micro`, `t3.small`, `t3.large`) for the RDS `instance_class` argument. Updated them to valid RDS instance class values (`db.t3.micro`, `db.t3.small`, `db.t3.large`).
- The GitHub Actions matrix was placed directly under the job. GitHub Actions requires matrix definitions under `strategy.matrix`, and jobs with steps need a runner. Added `runs-on: ubuntu-latest` and moved the matrix under `strategy`.
- The GitHub Actions snippet used `tofu` without checking out the repository or installing OpenTofu. Added `actions/checkout@v6` and `opentofu/setup-opentofu@v2`.
- The GitHub Actions apply command passed `-var="environment=..."`, but the post does not define an `environment` input variable and otherwise uses environment-specific `.tfvars` files. Changed it to use `-var-file="${{ matrix.environment }}.tfvars"`.
- The missing-workspace example used a shell fallback to create a workspace. OpenTofu now provides the dedicated `tofu workspace select -or-create` flag, so the example was updated to use the official command option.

## Review Notes
OpenTofu documentation confirms that `tofu workspace select`, `tofu workspace show`, `tofu workspace list`, `terraform.workspace`, `-var-file`, and `-or-create` are valid current usage. The local environment did not have the `tofu` binary installed, so CLI behavior was validated against official documentation rather than local `--help` output.

OpenTofu's documentation also notes that CLI workspaces are not a strong isolation mechanism for complex deployments requiring separate credentials or access controls. The post's examples are technically valid for simple shared-backend workflows, but future revisions could add that caveat.

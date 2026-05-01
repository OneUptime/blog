# Validation Summary: How to Use env0 for Cost Management with OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- env0 Terraform provider
- OpenTofu
- Infracost
- AWS cost monitoring in env0
- Open Policy Agent (OPA) approval policies
- HCL

## Sources Consulted
- env0 Terraform provider README: https://github.com/env0/terraform-provider-env0
- env0 environment resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/environment.md
- env0 template resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/template.md
- env0 project policy resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/project_policy.md
- env0 AWS cost credentials resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/aws_cost_credentials.md
- env0 project budget resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/project_budget.md
- env0 variable set resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/variable_set.md
- env0 variable set assignment resource docs: https://raw.githubusercontent.com/env0/terraform-provider-env0/main/docs/resources/variable_set_assignment.md
- env0 cost estimation docs: https://docs.env0.com/docs/cost-estimation
- env0 approval policies docs: https://docs.env0.com/docs/approval-policies
- env0 cost monitoring docs: https://docs.env0.com/docs/cost-monitoring
- OpenTofu `timestamp` function docs: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `timeadd` function docs: https://opentofu.org/docs/v1.6/language/functions/timeadd/

## Issues Found
- The post said provider authentication only relied on `ENV0_API_KEY`. I corrected this to the documented `ENV0_API_KEY` and `ENV0_API_SECRET` environment variables.
- The `env0_environment` example used unsupported fields such as `auto_deploy` and `opentofu_version`, and it omitted the documented template-to-project assignment requirement. I replaced those fields and added `env0_template_project_assignment` plus `depends_on`.
- The `env0_template` example used `branch` and `terraform_version = ""`, which do not match the documented current schema. I changed it to `revision`, added VCS integration wiring, and used `opentofu_version = "RESOLVE_FROM_CODE"`.
- The cost estimation section enabled the feature on `env0_environment`, but the documented control is `env0_project_policy.include_cost_estimation`. I also added the required `INFRACOST_API_KEY` prerequisite from env0’s cost estimation docs.
- The budget section used the wrong cost credential resource name and an unrelated `env0_environment_discovery_configuration` resource. I replaced them with `env0_aws_cost_credentials` and `env0_project_budget`.
- The post described project budgets as directly blocking deployments. I corrected that behavior: project budgets track actual spend and thresholds, while approval policies are the documented mechanism for denying or pausing applies based on cost estimation.
- The variable set examples omitted documented `scope`, `scope_id`, `type`, and `format` fields, so the variables would not clearly be Terraform input variables. I updated the schema usage and added an example environment assignment.
- The TTL example used a nonexistent `ttl_request` block. I replaced it with the documented `ttl` attribute and added `ignore_changes` so the `timestamp()`-based example does not create perpetual diffs on later runs.

## Review Notes
- env0 cost estimation runs on deployment plans. PR plans participate when `run_plan_on_pull_requests` is enabled and the environment comes from a VCS-integrated template.
- `env0_environment.ttl` expects an absolute timestamp rather than a relative `8-h` style value. Relative TTL strings are documented for env0 policy settings, not for the environment resource itself.
- Project budgets and cloud cost credentials are about actual cost visibility and notifications. Pre-apply guardrails come from approval policies that evaluate the `costEstimation` input.

# Validation Summary: How to Create Self-Service Terraform Templates

## Status
validated

## Post Type
Tutorial / Guide — walks through designing and implementing self-service Terraform template patterns for platform engineering teams.

## Technologies Covered
- Terraform (HCL, variable validation, locals, modules, version constraints)
- AWS provider resources: `aws_launch_template`, `aws_autoscaling_group`, `aws_cloudwatch_metric_alarm`
- AWS EC2 IMDSv2 (`metadata_options`)
- AWS Auto Scaling Group `instance_refresh` with rolling strategy
- Open Policy Agent (OPA) / Rego policy language
- HashiCorp Sentinel (mentioned)
- GitHub Actions (workflows, `actions/checkout`, `actions/github-script`)
- Terraform Cloud / HCP Terraform private module registry
- YAML (template catalog)

## Sources Consulted
- Terraform custom variable validation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- Terraform AWS provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform module source format: https://developer.hashicorp.com/terraform/language/modules/sources
- GitHub webhook events / pull_request payload schema: https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request
- OPA v1.0 / Rego v1 upgrade guide: https://www.openpolicyagent.org/docs/latest/v0-upgrade/
- `tj-actions/changed-files` action: https://github.com/tj-actions/changed-files

## Issues Found

1. **GitHub Actions: invalid use of `github.event.pull_request.changed_files`.** The original workflow referenced `${{ github.event.pull_request.changed_files[0] }}` to get the path of the first changed `.tfvars` file. In the GitHub `pull_request` webhook payload, `changed_files` is an integer count of changed files, not an array of file paths. Indexing it like an array does not produce a file path. **Fix:** Replaced this with a `tj-actions/changed-files@v44` step (filtered to `deployments/**/*.tfvars`) and referenced its `all_changed_files` output in subsequent steps for both template detection and `terraform plan -var-file`.

2. **OPA Rego: pre-v1 syntax (`deny[msg] { ... }`).** OPA v1.0 (released January 2025) deprecated the partial-rule shorthand without `contains`/`if` keywords. For a post dated 2026, new policies targeting current OPA should use Rego v1 syntax. **Fix:** Added `import rego.v1` and rewrote all three rules as `deny contains msg if { ... }`. Rule logic and intent are unchanged.

## Review Notes

- The `app_name` regex `^[a-z][a-z0-9-]{2,28}[a-z0-9]$` correctly enforces 4–30 characters as the error message claims (1 leading + 2–28 middle + 1 trailing = 4–30 total). Verified by hand.
- `metadata_options` (IMDSv2 hardening) values are correct: `http_endpoint = "enabled"`, `http_tokens = "required"`, `http_put_response_hop_limit = 1` are all valid per the AWS provider docs.
- `aws_autoscaling_group.instance_refresh.strategy = "Rolling"` is currently the only supported value, so this is correct (and forward-compatible if AWS adds others).
- `launch_template.version = "$Latest"` is a documented version alias (along with `$Default`) and is valid.
- Module source `app.terraform.io/myorg/web-application/aws` matches the documented HCP Terraform private registry format `<HOSTNAME>/<NAMESPACE>/<NAME>/<PROVIDER>`.
- The post's `tfvars` example doesn't actually contain a `template = ...` line, so the workflow's `grep "template" ...` step would not match anything as written — this is a minor illustrative gap in the example flow, but not a technical error in any individual snippet. Left as-is since it's clearly a sketch of how a real pipeline could parse a tfvars convention.
- The `actions/github-script@v7` final step contains only a placeholder comment, not real implementation — intentional pseudocode, not flagged.
- The post references `var.multi_az_subnets` and `var.single_az_subnet` without declaring them; these are implicit additional inputs the consumer would need to wire in. Acceptable for an illustrative snippet.

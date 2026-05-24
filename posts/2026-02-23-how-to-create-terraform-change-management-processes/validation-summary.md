# Validation Summary: How to Create Terraform Change Management Processes

## Status
validated

## Post Type
Guide / Process documentation (with illustrative code examples)

## Technologies Covered
- Terraform (CLI: `terraform show -json`, plan JSON schema)
- Python 3 (classification script)
- GitHub Actions (CI workflow, `gh` CLI)
- AWS CLI (`aws s3 cp`)
- AWS provider resource types (RDS, S3, KMS, IAM, security groups, etc.)
- Markdown templates (change request, change windows, review)

## Sources Consulted
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format#resource-change-representation (confirms `resource_changes`, `change.actions`, `type`, `address` fields and action values "create"/"read"/"update"/"delete"/"no-op")
- Terraform CLI docs for `terraform show -json`: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform AWS provider resource references (aws_db_instance, aws_rds_cluster, aws_elasticache_cluster, aws_efs_file_system, aws_s3_bucket, aws_kms_key, aws_security_group, aws_security_group_rule, aws_iam_role, aws_iam_policy, aws_iam_role_policy_attachment) — all are valid documented resource types
- GitHub Actions context syntax (`github.event.number`, `github.actor`, `github.run_number`, `github.sha`): https://docs.github.com/en/actions/learn-github-actions/contexts
- GitHub CLI `gh pr edit --add-label`: https://cli.github.com/manual/gh_pr_edit
- AWS CLI `aws s3 cp` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
No technical issues found. All code examples, CLI commands, JSON field names, resource type names, and workflow syntax are accurate and current.

## Review Notes
- The Python `classify_plan` function checks `actions == ['delete', 'create']` for resource replacement. Terraform may emit replacements as either `["delete", "create"]` or `["create", "delete"]` depending on whether `create_before_destroy` is set in the lifecycle block. The example would miss the `create_before_destroy` ordering. This is a minor incompleteness in illustrative code rather than a technical error, but a future revision could note it or check both orderings.
- The Python script `print`s `Risk Level: <LEVEL>` and the CI step captures that output with `RISK=$(python ...)` and `grep -q "CRITICAL"`. This works because "CRITICAL"/"HIGH" appear in the printed string, but it relies on stdout formatting; a more robust approach would print only the level on a single line or write to a file.
- The nested markdown code block in the "Change Request Template" (the inner ```` ``` ```` and ```` ```text ```` around the "Plan: X to add..." line) uses backtick fences inside an outer 3-backtick fence. In strict CommonMark this can terminate the outer fence early. Rendering may vary by parser, but this is presentation/Markdown style, not a Terraform/code technical error, so it was left as-authored.
- The post is primarily a governance/process guide. The included code snippets are illustrative templates, not a complete production system; readers should treat them as starting points.

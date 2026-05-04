# Validation Summary: How to Create EBS Snapshots with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Data Lifecycle Manager (DLM)
- AWS Elastic Block Store (EBS)
- AWS IAM (service roles, managed policies)
- AWS EventBridge cron expressions

## Sources Consulted
- Terraform AWS provider docs: `aws_dlm_lifecycle_policy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dlm_lifecycle_policy)
- Terraform AWS provider docs: `aws_ebs_snapshot` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_snapshot)
- Terraform AWS provider docs: `aws_ebs_volume` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume)
- Terraform AWS provider docs: `aws_iam_role` and `aws_iam_role_policy_attachment`
- AWS managed policies reference: `AWSDataLifecycleManagerServiceRole`
- AWS EventBridge / DLM cron expression syntax docs (day-of-week 1-7 = SUN-SAT)
- Terraform built-in functions docs: `formatdate`, `timestamp`, `jsonencode`

## Issues Found
No technical issues found.

Verified:
- `aws_dlm_lifecycle_policy` schema: `policy_details`, `resource_types = ["VOLUME"]`, `target_tags`, and `state = "ENABLED"` are all correct.
- `schedule.copy_tags` (boolean) is a valid argument at the schedule level (in addition to `cross_region_copy_rule.copy_tags`).
- `create_rule.interval_unit = "HOURS"` is valid (the only allowed value).
- `create_rule.times = ["03:00"]` is a valid list of 24-hour times.
- `create_rule.cron_expression = "cron(0 2 ? * 7 *)"` correctly fires Saturdays at 02:00 UTC (AWS cron day-of-week 7 = SAT).
- Schedule's `retain_rule` accepts `count` (1–1000) OR `interval`+`interval_unit` — both forms used correctly.
- `cross_region_copy_rule` for EBS DLM uses `target` (not `target_region`, which is only for IMAGE_MANAGEMENT) — correctly used.
- `cross_region_copy_rule.retain_rule` accepts `interval` and `interval_unit` only — correctly used.
- IAM managed policy ARN `arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole` is the correct policy for DLM EBS snapshot management.
- DLM service principal `dlm.amazonaws.com` in the assume-role policy is correct.
- `aws_ebs_volume` arguments (`availability_zone`, `size`, `type = "gp3"`) are valid.
- `aws_ebs_snapshot` arguments (`volume_id`, `description`, `tags`) are valid.
- `formatdate("YYYY-MM-DD", timestamp())` uses the correct Terraform format specifiers.

## Review Notes
- Using `timestamp()` inside `aws_ebs_snapshot.description` will cause the description to change on every plan/apply, which would force the snapshot resource to be replaced each run. The post frames this as a "one-time" pre-migration snapshot, so this is unlikely to bite in practice, but readers should be aware. Consider wrapping in `lifecycle { ignore_changes = [description] }` if used in a long-lived configuration.
- The post does not specify a minimum AWS provider version. The `cross_region_copy_rule.target` field name (vs. legacy `target_region`) requires AWS provider v3.x or later, which is well-established at the time of writing.
- DLM allows up to 4 schedules per policy; the multi-schedule example uses 2, well within the limit.
- For interval-based schedules without a `times` value (the hourly schedule example), DLM defaults the start time to 09:00 UTC and runs every interval thereafter — readers may want to set `times` explicitly if they need a specific anchor.

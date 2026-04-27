# Validation Summary: How to Handle Out-of-Band Changes to Infrastructure in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu (`tofu` CLI)
- HCL (Terraform/OpenTofu configuration language)
- AWS provider resources (`aws_autoscaling_group`, `aws_db_instance`, `aws_security_group`)
- AWS CloudTrail (`aws cloudtrail lookup-events`)
- AWS Service Control Policies (SCPs)

## Sources Consulted
- OpenTofu CLI docs (`tofu plan`, `tofu apply`, `-refresh-only` flag): https://opentofu.org/docs/cli/commands/plan/ and https://opentofu.org/docs/cli/commands/apply/
- OpenTofu lifecycle `ignore_changes` documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- Terraform AWS provider — `aws_autoscaling_group` (`tag` block, `desired_capacity`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider — `aws_db_instance` (`password`, `snapshot_identifier`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS CLI reference for `cloudtrail lookup-events` (response shape, top-level vs. CloudTrailEvent fields): https://awscli.amazonaws.com/v2/documentation/api/latest/reference/cloudtrail/lookup-events.html
- AWS Organizations SCP syntax / `aws:PrincipalArn` condition key: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html

## Issues Found
- **CloudTrail query referenced a non-existent top-level field.** The original `--query "Events[*].{Time:EventTime, User:Username, IP:SourceIPAddress}"` would always return `null` for the `IP` field, because `lookup-events` only returns `EventId`, `EventName`, `ReadOnly`, `AccessKeyId`, `EventTime`, `EventSource`, `Username`, `Resources`, and `CloudTrailEvent` at the top level. `SourceIPAddress` lives inside the `CloudTrailEvent` JSON string and must be extracted by parsing it (e.g. with `jq`). I replaced `IP:SourceIPAddress` with `EventId:EventId` (a real top-level field) and added a comment explaining where `SourceIPAddress` actually lives, so a reader who needs it knows to parse `CloudTrailEvent`.

## Review Notes
- The other OpenTofu/Terraform commands (`tofu plan -refresh-only`, `tofu apply -refresh-only`, `-no-color`) and `lifecycle.ignore_changes` syntax are correct and match current OpenTofu documentation.
- `ignore_changes = [desired_capacity, tag]` correctly references the `tag` configuration block on `aws_autoscaling_group`. Note that the AWS provider also exposes a deprecated `tags` map argument; if a future reader is on a very old provider version that uses `tags`, they may need to adjust accordingly.
- The SCP snippet is shown commented-out and is illustrative; the JSON syntax, `Effect`, `Action`, `Resource`, and `aws:PrincipalArn` condition are all valid SCP constructs.
- The `aws_db_instance` `ignore_changes = [password, snapshot_identifier]` example is valid, but in practice managing the master password via Secrets Manager (`manage_master_user_password`) is increasingly preferred — out of scope for this fix, but worth noting for a future revision.

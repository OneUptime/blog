# Validation Summary: How to Import AWS EC2 Instances into OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EC2
- AWS CLI
- HashiCorp AWS provider / `aws_instance`
- HCL
- `jq`

## Sources Consulted
- OpenTofu import block documentation: https://opentofu.org/docs/language/import/
- OpenTofu CLI import documentation: https://opentofu.org/docs/cli/import/
- OpenTofu lifecycle meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu upgrade guide noting v1.6 as the first stable v1.x release: https://opentofu.org/docs/language/upgrade-guides/
- AWS CLI `describe-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The introduction and conclusion said the HCL must already match the instance before import. I corrected this to reflect OpenTofu's documented workflow: you must define the resource first, then reconcile differences after import.
- The Step 2 wording overstated the requirement to perfectly match configuration before import. I changed it to say the resource block should match as closely as possible before import, which aligns with the later reconciliation step.
- The Step 4 `jq` example returned `IamInstanceProfile.Arn`, but the `aws_instance.iam_instance_profile` argument expects the instance profile name, not the ARN. I updated the example to derive the profile name from the ARN.
- The Step 5 heading said `import` blocks were for "OpenTofu 1.5+". OpenTofu's first stable v1.x release was 1.6, and import block documentation is present in OpenTofu v1.6. I corrected the version note to `OpenTofu 1.6+`.
- The Step 5 text and inline comment were too loose about how `import` blocks execute. I updated them to match OpenTofu's documented behavior: imports are reviewed during `plan` and executed during `apply`.
- The `ignore_changes` commentary implied `user_data` is "managed by cloud-init separately" and that `ami` simply "changes frequently". I corrected the comments to describe valid `ignore_changes` use cases more accurately.
- The Step 1 output comment implied the command returns only a bare instance ID, even though `--output table` produces a table. I adjusted the note to reflect that the example output includes the instance ID rather than being only the instance ID.

## Review Notes
- OpenTofu still documents configuration-driven imports as experimental as of 2026-04-30, so the post now labels that explicitly.
- The sample AMI ID is illustrative only; real AMI IDs are region-specific and may differ or no longer exist in another account or region.
- The commands and configuration were validated against official documentation, but they were not executed against a live AWS account in this review.

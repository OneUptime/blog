# Validation Summary: How to Set Up AWS Config Rules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Config
- AWS IAM
- Amazon S3
- AWS Systems Manager Automation
- AWS CLI

## Sources Consulted
- AWS Config managed rules overview: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html
- AWS Config rule `s3-bucket-public-read-prohibited`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
- AWS Config rule `root-account-mfa-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html
- AWS Config rule `ec2-ebs-encryption-by-default`: https://docs.aws.amazon.com/config/latest/developerguide/ec2-ebs-encryption-by-default.html
- AWS Config rule `cloudtrail-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html
- AWS Config conformance packs overview: https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html
- AWS Config sample conformance packs: https://docs.aws.amazon.com/config/latest/developerguide/conformancepack-sample-templates.html
- AWS Config S3 delivery permissions: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
- AWS managed policy `AWS_ConfigRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWS_ConfigRole.html
- AWS CLI `describe-compliance-by-config-rule`: https://docs.aws.amazon.com/cli/latest/reference/configservice/describe-compliance-by-config-rule.html
- AWS CLI `get-compliance-summary-by-config-rule`: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-compliance-summary-by-config-rule.html
- AWS Systems Manager runbook `AWS-DisableS3BucketPublicReadWrite`: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-disables3bucketpublicreadwrite.html
- Terraform AWS provider docs for `aws_config_configuration_recorder`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_configuration_recorder.html.markdown
- Terraform AWS provider docs for `aws_config_configuration_recorder_status`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_configuration_recorder_status.html.markdown
- Terraform AWS provider docs for `aws_config_delivery_channel`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_delivery_channel.html.markdown
- Terraform AWS provider docs for `aws_config_config_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_config_rule.html.markdown
- Terraform AWS provider docs for `aws_config_conformance_pack`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_conformance_pack.html.markdown
- Terraform AWS provider docs for `aws_config_remediation_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_remediation_configuration.html.markdown
- AWS Config sample template repository: https://github.com/awslabs/aws-config-rules/tree/master/aws-config-conformance-packs

## Issues Found
- The prerequisites said the AWS Config recorder had to already be enabled even though Step 1 enables it. I removed that contradiction and replaced it with the required IAM/S3/AWS Config permissions.
- The Step 1 code referenced `data.aws_caller_identity.current.account_id` without defining the data source. I added the missing `aws_caller_identity` data source.
- The delivery-channel example created an S3 bucket but did not grant the recorder role S3 permissions needed to verify the bucket and write configuration snapshots. I added an inline IAM policy for `s3:GetBucketAcl`, `s3:ListBucket`, and `s3:PutObject`, and made recorder startup wait for those permissions.
- The `CLOUD_TRAIL_ENABLED` rule description claimed the rule checked log file validation, which that managed rule does not do. I changed the description to match the documented behavior and the provided `s3BucketName` parameter.
- The conformance-pack section mixed two different packs: the prose said CIS AWS Benchmark, while the template URI pointed at a CIS Critical Security Controls v8 IG1 template and used an undocumented S3 URI. I changed the example to use the documented CIS AWS Foundations Benchmark Level 1 sample template via `template_body`.
- The remediation example paired the public-read rule with an encryption runbook, which would remediate the wrong issue. I replaced it with the SSM Automation runbook `AWS-DisableS3BucketPublicReadWrite` and the correct parameters, including `AutomationAssumeRole`.
- The deployment command used the wrong AWS CLI service namespace (`config`) and an invalid filtered call to `get-compliance-summary-by-config-rule`. I replaced it with the documented `configservice describe-compliance-by-config-rule --config-rule-names ...` command.

## Review Notes
- `ROOT_ACCOUNT_MFA_ENABLED` is a periodic rule tied to account-level/global IAM state and has region-availability caveats in the AWS Config documentation. The post’s example is still valid, but production deployments should choose supported regions deliberately.
- The conformance-pack example now assumes the sample template file has been downloaded locally into the module directory. That is technically valid, but the post could be improved later with a short download example.
- `var.remediation_role_arn` must refer to an IAM role that Systems Manager Automation can assume to run the remediation document successfully.

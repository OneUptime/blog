# Validation Summary: How to Build a Landing Zone with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Organizations
- AWS Service Control Policies
- AWS CloudTrail
- Amazon S3 bucket policies
- AWS Config
- Amazon GuardDuty
- AWS IAM
- Amazon EBS encryption
- AWS Transit Gateway

## Sources Consulted
- Terraform AWS Provider `aws_organizations_organization`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_organization.html.markdown
- Terraform AWS Provider `aws_organizations_account`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_account.html.markdown
- Terraform AWS Provider `aws_organizations_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_policy.html.markdown
- Terraform AWS Provider `aws_cloudtrail`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudtrail.html.markdown
- Terraform AWS Provider `aws_config_configuration_recorder`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/config_configuration_recorder.html.markdown
- Terraform AWS Provider `aws_config_delivery_channel`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/config_delivery_channel.html.markdown
- Terraform AWS Provider `aws_guardduty_detector`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector.html.markdown
- Terraform AWS Provider `aws_ebs_encryption_by_default`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ebs_encryption_by_default.html.markdown
- AWS CloudTrail, creating a trail for an organization: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html
- AWS CloudTrail, organization trail bucket policy: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-an-organizational-trail-by-using-the-aws-cli.html
- AWS CloudTrail `DataResource` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS Config, starting a configuration recorder: https://docs.aws.amazon.com/config/latest/developerguide/gs-cli-subscribe.html
- AWS Organizations, service control policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Control Tower landing zone concepts: https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html

## Issues Found
- The CloudTrail S3 data event selector used `values = ["arn:aws:s3:::"]`, which is not the documented prefix for logging all S3 object data events. Changed it to `values = ["arn:aws:s3"]`.
- The CloudTrail bucket policy allowed writes to the entire bucket path and did not include the organization-trail log prefix or `aws:SourceArn` conditions recommended by AWS. Restricted the write resource to `AWSLogs/${var.org_id}/*` and added `aws:SourceArn` conditions for both write and ACL-check statements.
- The CloudTrail resource could be created before the S3 bucket policy, causing CloudTrail validation failures. Added an explicit `depends_on` for the bucket policy.
- The AWS Config example created a recorder and delivery channel but did not start the recorder. Added `aws_config_configuration_recorder_status` with a dependency on the delivery channel.
- The S3 encryption SCP comment said it required encryption on buckets, but the policy controls `s3:PutObject` uploads. Updated the comment to say object uploads.

## Review Notes
Terraform is not installed in this workspace, so I could not run `terraform validate` against the snippets. The remaining examples are still illustrative and omit surrounding provider aliases, IAM roles, KMS key policy details, and variable definitions that a complete landing-zone repository would need.

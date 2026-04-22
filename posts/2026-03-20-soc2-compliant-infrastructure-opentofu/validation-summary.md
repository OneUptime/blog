# Validation Summary: How to Implement SOC 2-Compliant Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS Security Hub
- Amazon GuardDuty
- AWS Config
- Amazon CloudWatch Logs and alarms
- AWS CloudTrail
- Amazon RDS
- Amazon EC2 Auto Scaling
- Amazon S3
- Atlantis
- SOC 2 Trust Services Criteria

## Sources Consulted
- AICPA & CIMA Trust Services Criteria: https://www.aicpa-cima.com/resources/download/trust-services-criteria
- AWS IAM global condition context keys, including `aws:MultiFactorAuthPresent`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM secure API access with MFA: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html
- AWS Security Hub CloudWatch controls for root user metric filters and alarms: https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html
- AWS Prescriptive Guidance for monitoring IAM root user activity: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/monitor-iam-root-user-activity.html
- Amazon RDS Multi-AZ DB instance deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon RDS backup retention period: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- Amazon RDS Enhanced Monitoring setup: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Atlantis repo-level configuration for OpenTofu distribution: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Terraform AWS Provider resource documentation source for IAM, Config, CloudWatch, RDS, Auto Scaling, Security Hub, GuardDuty, and S3 resources: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/r

## Issues Found

1. **Overstated SOC 2/OpenTofu claim**: The post implied OpenTofu itself codifies all controls auditors look for. Updated the description and opening wording to SOC 2-aligned controls and repeatable technical evidence, because SOC 2 scope and control sufficiency are determined by the audit and organization.

2. **Incomplete CC6 label**: Updated `CC6 Logical Access` to `CC6 Logical and Physical Access` to match the Trust Services Criteria naming.

3. **MFA policy was not enforced**: The original snippet created an IAM policy but did not attach it to any IAM principal. Added an IAM group and `aws_iam_group_policy_attachment`, and clarified that the password policy is for strong console passwords, not MFA enforcement.

4. **AWS Config recorder ordering was incomplete**: Added `depends_on = [aws_config_delivery_channel.main]` because the AWS provider documentation recommends a delivery channel before starting the configuration recorder.

5. **Root account alarm was incomplete and overstated**: The CloudWatch alarm referenced a metric that was never created and called root usage a SOC 2 violation. Added `aws_cloudwatch_log_metric_filter` with the AWS Security Hub/CIS root-user pattern, changed the namespace to `LogMetrics`, changed the alarm threshold to greater-than-or-equal-to `1`, and softened the language to AWS best practice/common audit evidence.

6. **RDS example omitted required DB instance arguments**: Added required and practical fields such as `engine`, `engine_version`, `instance_class`, `allocated_storage`, `username`, and `manage_master_user_password`. Kept the existing Multi-AZ, 35-day backup retention, encryption, deletion protection, and enhanced monitoring controls.

7. **OpenTofu version evidence was stale**: Replaced the fixed `OpenTofu 1.6.0` evidence string with guidance to pin and record the exact OpenTofu 1.x version in CI.

8. **State storage evidence wording was imprecise**: Changed the state storage evidence from generic CloudTrail logging to CloudTrail data event logging for the S3 backend.

9. **Audit evidence bucket was not locked down in the example**: Added an S3 public access block for the audit evidence bucket.

10. **Auditor role did not grant read-only access**: The original role only had a trust policy. Added an inline S3 read-only permissions policy scoped to the audit evidence bucket and object versions.

11. **Audit-period evidence claim was too specific**: Replaced the fixed `3-6 months` statement with evidence availability throughout the audit period, because the Type 2 review period is determined by the audit scope.

## Review Notes
- The snippets remain illustrative and still assume supporting resources exist elsewhere, such as the CloudTrail log group, SNS topic, AWS Config recorder/delivery channel, Auto Scaling group, and RDS monitoring role.
- Local `tofu` and `terraform` binaries were not installed in the workspace, so I could not run `tofu validate`; validation was performed against official documentation and manual HCL review.

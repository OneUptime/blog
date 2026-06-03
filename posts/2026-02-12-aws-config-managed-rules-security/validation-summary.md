# Validation Summary: How to Use AWS Config Managed Rules for Security Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Config managed rules
- AWS CLI for AWS Config
- Terraform AWS provider
- IAM, Amazon EBS, Amazon RDS, Amazon S3, Amazon VPC, and AWS CloudTrail security controls

## Sources Consulted
- AWS Config managed rules list: https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html
- AWS Config `put-config-rule` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-config-rule.html
- AWS Config compliance CLI references: https://docs.aws.amazon.com/cli/latest/reference/configservice/get-compliance-summary-by-config-rule.html, https://docs.aws.amazon.com/cli/latest/reference/configservice/get-compliance-details-by-config-rule.html, https://docs.aws.amazon.com/cli/latest/reference/configservice/get-compliance-details-by-resource.html
- AWS Config IAM rules: https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/root-account-hardware-mfa-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/iam-user-mfa-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/iam-user-unused-credentials-check.html, https://docs.aws.amazon.com/config/latest/developerguide/access-keys-rotated.html, https://docs.aws.amazon.com/config/latest/developerguide/iam-policy-no-statements-with-admin-access.html
- AWS Config encryption rules: https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html, https://docs.aws.amazon.com/config/latest/developerguide/rds-storage-encrypted.html, https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-ssl-requests-only.html, https://docs.aws.amazon.com/config/latest/developerguide/cloud-trail-encryption-enabled.html
- AWS Config network and logging rules: https://docs.aws.amazon.com/config/latest/developerguide/restricted-ssh.html, https://docs.aws.amazon.com/config/latest/developerguide/restricted-common-ports.html, https://docs.aws.amazon.com/config/latest/developerguide/vpc-default-security-group-closed.html, https://docs.aws.amazon.com/config/latest/developerguide/vpc-flow-logs-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/cloud-trail-log-file-validation-enabled.html, https://docs.aws.amazon.com/config/latest/developerguide/multi-region-cloudtrail-enabled.html
- Terraform AWS provider `aws_config_config_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule

## Issues Found
- The unused IAM credentials comment said credentials are disabled. The managed rule only checks for IAM users with passwords or active access keys unused for the configured age, so the comment was changed to say it checks for recently unused credentials.
- The IAM policy rule example used the Config rule name `iam-no-inline-policy-check`, which is misleading because `IAM_POLICY_NO_STATEMENTS_WITH_ADMIN_ACCESS` evaluates customer managed policies, not inline policies or AWS managed policies. The comment and example rule name were updated to match the rule behavior.
- The EBS encryption comment said the rule checks all EBS volumes. AWS documents `ENCRYPTED_VOLUMES` as checking attached EBS volumes, so the comment was narrowed accordingly.

## Review Notes
- The AWS CLI and Terraform binaries are not installed in this workspace, so local command execution and Terraform validation were not possible. Syntax and arguments were verified against official AWS CLI documentation and the Terraform AWS provider documentation.
- Several IAM-related AWS Config managed rules have regional caveats for global IAM resource recording. The examples are still valid, but production rollouts should account for AWS Config region support and recording configuration.

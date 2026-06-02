# Validation Summary: How to Use Security Hub Compliance Standards (CIS, PCI DSS)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Security Hub CSPM
- AWS Security Hub compliance standards
- CIS AWS Foundations Benchmark
- PCI DSS
- NIST SP 800-53
- AWS Foundational Security Best Practices
- AWS CLI
- Amazon EventBridge
- AWS CloudTrail
- Amazon S3
- AWS IAM
- Terraform AWS provider

## Sources Consulted
- AWS Security Hub CSPM standards reference: https://docs.aws.amazon.com/securityhub/latest/userguide/standards-reference.html
- CIS AWS Foundations Benchmark in Security Hub CSPM: https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- PCI DSS in Security Hub CSPM: https://docs.aws.amazon.com/securityhub/latest/userguide/pci-standard.html
- AWS CLI batch-enable-standards command reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/batch-enable-standards.html
- AWS CLI get-findings command reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/get-findings.html
- AWS CLI describe-standards-controls command reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/describe-standards-controls.html
- AWS CLI update-standards-control command reference: https://docs.aws.amazon.com/cli/latest/reference/securityhub/update-standards-control.html
- AWS IAM root user access key deletion documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user_manage_delete-key.html
- AWS Security Hub EventBridge event pattern documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-all-findings.html
- AWS Security Hub sample control findings: https://docs.aws.amazon.com/securityhub/latest/userguide/sample-control-findings.html
- AWS Security Hub S3 controls: https://docs.aws.amazon.com/securityhub/latest/userguide/s3-controls.html
- Terraform AWS provider `aws_securityhub_standards_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform AWS provider `aws_securityhub_standards_control` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_control

## Issues Found
- The post described Security Hub's supported standards as if only CIS v1.4.0 and PCI DSS v3.2.1 were current. Updated the wording to include current CIS versions v5.0.0, v3.0.0, v1.4.0, and v1.2.0, and PCI DSS v4.0.1 and v3.2.1.
- The CIS v1.4.0 `StandardsArn` examples used the legacy regionless `ruleset` ARN format. Updated the AWS CLI and Terraform examples to use the regional `standards/cis-aws-foundations-benchmark/v/1.4.0` ARN. The regionless `ruleset` ARN applies to CIS v1.2.0.
- The root access key remediation note said root access keys cannot be deleted via CLI. Updated it to state that AWS supports `aws iam delete-access-key` when authenticated as the root user.
- The S3 encryption example was labeled as CIS 2.1.1, but CIS v1.4.0 requirement 2.1.1 is not the Security Hub S3 encryption check. Updated the example to reference Security Hub control S3.17 and changed the command to check for KMS-based bucket default encryption.
- The CloudTrail command displayed `HasCustomEventSelectors` as if it proved logging status. Updated the command to call `get-trail-status` for multi-Region trails and report `IsLogging`.
- The PCI DSS control IDs and descriptions were partially incorrect. Updated them to the current Security Hub PCI control identifiers and descriptions for CloudTrail, IAM root access keys, and S3 public access controls.
- The disabled-control example used a reason about IAM password rotation for CIS v1.4.0 control 1.14, which is access key rotation. Updated the reason to refer to IAM user access keys.
- Replaced "updates in real time" with "updates as findings change" to avoid overstating Security Hub evaluation timing.

## Review Notes
AWS CLI is not installed in the local environment, so command verification was done against official AWS CLI command reference pages rather than local `aws help` output. The Terraform Registry pages require JavaScript in the browser view, but the resource names and arguments were cross-checked against the Registry documentation URLs and AWS Security Hub ARN documentation.

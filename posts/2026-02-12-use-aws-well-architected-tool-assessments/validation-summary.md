# Validation Summary: How to Use AWS Well-Architected Tool for Assessments

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Well-Architected Tool
- AWS Well-Architected Framework lenses
- AWS CLI for Well-Architected Tool
- AWS IAM policies
- AWS Config managed rules
- Terraform HCL for IAM and AWS Config resources

## Sources Consulted
- AWS Well-Architected Tool User Guide: What is AWS WA Tool - https://docs.aws.amazon.com/wellarchitected/latest/userguide/intro.html
- AWS Well-Architected Tool User Guide: Defining a workload - https://docs.aws.amazon.com/wellarchitected/latest/userguide/define-workload.html
- AWS Well-Architected Tool User Guide: Using lenses - https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses.html
- AWS Well-Architected Tool User Guide: Identify and understand risks - https://docs.aws.amazon.com/wellarchitected/latest/userguide/identify-and-understand-risks.html
- AWS Well-Architected Tool User Guide: Generate a workload report - https://docs.aws.amazon.com/wellarchitected/latest/userguide/workloads-report.html
- AWS CLI Command Reference: aws wellarchitected create-workload - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/create-workload.html
- AWS CLI Command Reference: aws wellarchitected list-lens-review-improvements - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/list-lens-review-improvements.html
- AWS CLI Command Reference: aws wellarchitected create-milestone - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/create-milestone.html
- AWS CLI Command Reference: aws wellarchitected create-workload-share - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/create-workload-share.html
- AWS Config managed rule: encrypted-volumes - https://docs.aws.amazon.com/config/latest/developerguide/encrypted-volumes.html
- AWS Config managed rule: rds-multi-az-support - https://docs.aws.amazon.com/config/latest/developerguide/rds-multi-az-support.html
- AWS Config managed rule: s3-default-encryption-kms - https://docs.aws.amazon.com/config/latest/developerguide/s3-default-encryption-kms.html
- AWS Config managed rule: backup-plan-min-frequency-and-min-retention-check - https://docs.aws.amazon.com/config/latest/developerguide/backup-plan-min-frequency-and-min-retention-check.html
- HashiCorp AWS Provider repository/docs search for Well-Architected resource support - https://github.com/hashicorp/terraform-provider-aws

## Issues Found
- The workload definition list included "Non-production" as an environment choice. Current AWS Well-Architected Tool documentation and the create-workload API list only Production and Pre-production, so the post now says "Production or Pre-production."
- The post included a Terraform `aws_wellarchitected_workload` resource example. The current HashiCorp AWS provider does not expose that resource, so the unsupported Terraform workload example was removed while keeping the verified AWS CLI example.
- Several AWS CLI examples used `abc123` as a workload ID. AWS Well-Architected workload IDs must be 32-character lowercase hexadecimal strings, so the examples now use `1234567890abcdef1234567890abcdef`.
- The question workflow said selecting "None of these" flags a high-risk issue. AWS Well-Architected Tool identifies both high-risk and medium-risk issues, so the text now says it flags a risk.

## Review Notes
The AWS CLI command names and options for creating workloads, listing lens review improvements, creating milestones, and sharing workloads were verified against official AWS CLI documentation. The AWS Config managed rule identifiers and backup rule input parameters were verified against AWS Config managed rule documentation. The AWS CLI and Terraform binaries were not installed in the workspace, so syntax was reviewed against official documentation rather than local command execution.

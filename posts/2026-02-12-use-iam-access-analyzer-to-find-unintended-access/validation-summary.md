# Validation Summary: How to Use IAM Access Analyzer to Find Unintended Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM Access Analyzer
- AWS IAM policies and resource-based policies
- AWS CLI
- Amazon S3 bucket policies
- AWS Organizations
- CloudTrail-based policy generation
- Terraform AWS provider
- Amazon EventBridge

## Sources Consulted
- AWS IAM User Guide: IAM Access Analyzer supported resource types for external and internal access - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-resources.html
- AWS IAM User Guide: IAM Access Analyzer findings - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings.html
- AWS IAM User Guide: IAM Access Analyzer filter keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-reference-filter-keys.html
- AWS IAM User Guide: IAM policy validation check reference - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-reference-policy-checks.html
- AWS IAM User Guide: Create an IAM Access Analyzer unused access analyzer - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-create-unused.html
- AWS IAM User Guide: Monitoring IAM Access Analyzer with Amazon EventBridge - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-eventbridge.html
- AWS CLI Command Reference: accessanalyzer create-analyzer - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/create-analyzer.html
- AWS CLI Command Reference: accessanalyzer list-findings - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/list-findings.html
- AWS CLI Command Reference: accessanalyzer validate-policy - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/validate-policy.html
- AWS CLI Command Reference: accessanalyzer start-policy-generation - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/start-policy-generation.html
- AWS CLI Command Reference: accessanalyzer get-generated-policy - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/get-generated-policy.html
- Terraform Registry: aws_accessanalyzer_analyzer and aws_accessanalyzer_archive_rule resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/accessanalyzer_analyzer and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/accessanalyzer_archive_rule

## Issues Found
- The supported resource list was incomplete and included S3 access points as a monitored resource type. Current IAM Access Analyzer finding resource types include S3 buckets and S3 Express directory buckets, but not a separate access point resource type; access points can contribute to S3 bucket findings. Updated the list and added currently supported RDS DB cluster snapshots, EFS file systems, and DynamoDB tables and streams.
- The policy validation sample response showed `PASS_ROLE_WITH_STAR_IN_RESOURCE`, but the sample policy did not include `iam:PassRole`. Updated the sample policy and finding details so the command and example response align with AWS's documented policy check.
- The policy generation description overstated the generated policy as covering only actions actually performed. Updated it to explain that generated policies are based on actions IAM Access Analyzer identifies from CloudTrail and service last accessed data, with a note to review incomplete generated results.
- The unused access analyzer comment said it requires AWS Organizations. AWS supports `ACCOUNT_UNUSED_ACCESS` analyzers for a single account and `ORGANIZATION_UNUSED_ACCESS` for organization-level analysis. Updated the comment.
- The unused access findings list omitted IAM user passwords and was imprecise about unused permissions. Updated it to match AWS's documented finding categories: unused roles, unused IAM user access keys and passwords, and unused permissions granted to roles.
- The multi-region guidance applied broadly to all of Access Analyzer even though unused access findings are not resource-region dependent. Updated the wording to specify external access analyzers and resource-sharing coverage.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI command reference documentation rather than local `aws --help` output. The EventBridge pattern and Terraform snippets matched current documented structures.

# Validation Summary: How to Use Terraform for Compliance Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- Open Policy Agent (OPA) and Rego
- AWS S3
- AWS EBS
- AWS Config remediation
- AWS Systems Manager Automation runbooks
- AWS Lambda
- GitHub Actions
- Checkov
- Python, boto3, and botocore

## Sources Consulted
- Terraform AWS Provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket.html
- Terraform AWS Provider `aws_config_remediation_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration
- Terraform JSON plan format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent Rego `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- Open Policy Agent Terraform integration documentation: https://www.openpolicyagent.org/docs/latest/terraform/
- Open Policy Agent CLI documentation: https://www.openpolicyagent.org/docs/latest/cli/
- boto3 S3 `get_bucket_encryption` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_encryption.html
- Amazon S3 default encryption FAQ: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
- AWS Systems Manager `AWS-EnableS3BucketEncryption` runbook reference: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enableS3bucketencryption.html
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Rego snippet was marked as `hcl` and used pre-OPA-1.0 partial set syntax (`deny[msg]`). Changed the fence to `rego`, added `import rego.v1`, and updated the rules to `deny contains msg if`.
- The S3 Terraform policy checked the deprecated inline `server_side_encryption_configuration` field on `aws_s3_bucket`. Updated it to look for a companion `aws_s3_bucket_server_side_encryption_configuration` resource in the plan.
- The OPA CI command only printed policy results and would not fail the workflow when violations existed. Added `--fail-defined` and changed the query to `data.terraform.compliance.preventive.deny[_]`.
- The boto3 S3 scanner treated missing bucket encryption configuration as the expected failure mode. Since Amazon S3 applies SSE-S3 by default for new objects, changed the example to validate explicit SSE-KMS default encryption and to handle `botocore.exceptions.ClientError`.
- The scanner did not write `compliance-report.json`, even though the workflow uploaded that file. Added a `__main__` block that runs the scans and writes the report.
- The Python examples used `datetime.utcnow()`, which is deprecated in modern Python, and the audit report snippet omitted the `datetime` import. Updated both snippets to use `datetime.now(UTC)` and added the necessary imports.
- The audit report calculation divided by zero for empty result sets and accessed `severity` directly. Added a zero-result guard and used `r.get("severity")`.
- The AWS Config remediation example omitted commonly required remediation metadata and the automation assume role parameter shown in the provider and runbook examples. Added `resource_type`, `target_version`, and `AutomationAssumeRole`.

## Review Notes
Terraform, OPA, and Checkov CLIs are not installed in this workspace, so their examples were checked against official documentation rather than executed locally. The Python snippets were parsed successfully with Python 3.12.

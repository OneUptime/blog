# Validation Summary: How to Use AWS Inspector for Lambda Function Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Inspector
- AWS Lambda
- AWS CLI
- Terraform AWS Provider
- Boto3 / Python
- Amazon S3 and AWS KMS for findings reports
- AWS Organizations delegated administration

## Sources Consulted
- AWS Inspector User Guide: Scanning AWS Lambda functions with Amazon Inspector: https://docs.aws.amazon.com/inspector/latest/user/scanning-lambda.html
- AWS Inspector User Guide: Amazon Inspector Lambda standard scanning: https://docs.aws.amazon.com/inspector/latest/user/scanning_resources_lambda.html
- AWS Inspector User Guide: Activating a scan type: https://docs.aws.amazon.com/inspector/latest/user/activate-scans.html
- AWS Inspector User Guide: Supported operating systems and programming languages for Amazon Inspector: https://docs.aws.amazon.com/inspector/latest/user/supported.html
- AWS Lambda Developer Guide: Automate security assessments for Lambda with Amazon Inspector: https://docs.aws.amazon.com/lambda/latest/dg/governance-code-scanning.html
- AWS Inspector User Guide: Excluding functions from Lambda standard scanning: https://docs.aws.amazon.com/inspector/latest/user/scanning_resources_lambda_exclude_functions.html
- AWS CLI Command Reference: inspector2 enable: https://docs.aws.amazon.com/cli/latest/reference/inspector2/enable.html
- AWS CLI Command Reference: inspector2 list-findings: https://docs.aws.amazon.com/cli/latest/reference/inspector2/list-findings.html
- AWS CLI Command Reference: inspector2 batch-get-account-status: https://docs.aws.amazon.com/cli/latest/reference/inspector2/batch-get-account-status.html
- AWS CLI Command Reference: inspector2 create-findings-report: https://docs.aws.amazon.com/cli/latest/reference/inspector2/create-findings-report.html
- AWS CLI Command Reference: inspector2 update-organization-configuration: https://docs.aws.amazon.com/cli/latest/reference/inspector2/update-organization-configuration.html
- Boto3 Inspector2 list_findings reference: https://docs.aws.amazon.com/boto3/latest/reference/services/inspector2/client/list_findings.html
- Terraform AWS Provider aws_inspector2_enabler resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_enabler
- Amazon Inspector pricing: https://aws.amazon.com/inspector/pricing/

## Issues Found
- The post said Lambda code scanning currently supports only Python, Java, and Node.js. Updated it to include the currently supported language families: Java, .NET, Node.js, Python, and Ruby.
- The post implied Lambda code scanning could be enabled independently. Updated the wording to clarify that code scanning is enabled together with standard scanning, because standard scanning must be active first.
- The verification command used incorrect AWS CLI JMESPath output casing: `Accounts[0].ResourceState.Lambda`. Changed it to `accounts[0].resourceState.lambda.status`.
- The post said to use `update-configuration` when Inspector was already enabled for other resource types. That command only updates EC2/ECR scan settings, not Lambda scan activation. Replaced it with `aws inspector2 enable --resource-types LAMBDA`.
- The Lambda code scanning CLI example enabled only `LAMBDA_CODE`. Updated it to enable `LAMBDA LAMBDA_CODE` together.
- The post described scanning all Lambda functions without the eligibility caveats. Added the documented eligibility requirements: supported runtime, invoked or updated in the last 90 days, `$LATEST`, no exclusion tag, and not encrypted with a customer managed KMS key.
- The finding details query used incorrect AWS CLI response casing such as `Findings`, `Resources`, and `PackageVulnerabilityDetails`. Updated the query to the documented lowercase response members.
- The Python/Boto3 example read `response['Findings']`, but Boto3 returns `findings`. Updated the script and switched to the documented paginator so it does not miss results beyond the first page.
- The organization auto-enable example omitted required `ec2` and `ecr` fields in the `autoEnable` object. Added them to the example and clarified that this setting applies to new organization members.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI validation was performed against the current official AWS CLI command reference instead of local `--help` output. The pricing section remains intentionally high-level because Inspector prices vary by Region and should be checked on the official pricing page.

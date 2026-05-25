# Validation Summary: How to Create Systems Manager Parameters in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Systems Manager Parameter Store
- AWS Key Management Service
- AWS Identity and Access Management
- Python boto3
- AWS SDK for JavaScript v3
- AWS Secrets Manager

## Sources Consulted
- Terraform Registry: `aws_ssm_parameter` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Registry: `aws_ssm_parameter` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Terraform lifecycle `ignore_changes` documentation: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Systems Manager Parameter Store parameter types: https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-a-parameter.html
- AWS Systems Manager Parameter Store hierarchy documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html
- AWS Systems Manager `GetParametersByPath` API reference: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html
- AWS KMS encryption for Parameter Store `SecureString` parameters: https://docs.aws.amazon.com/kms/latest/developerguide/services-parameter-store.html
- AWS Systems Manager Parameter Store tier documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html
- AWS Systems Manager Parameter Store IAM access documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html
- boto3 SSM client reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ssm.html
- AWS SDK for JavaScript v3 Systems Manager examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_ssm_code_examples.html
- AWS Systems Manager pricing: https://aws.amazon.com/systems-manager/pricing/
- AWS Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/

## Issues Found
- The `SecureString` Terraform example said `ignore_changes = [value]` prevents Terraform from showing the value in plan output. The AWS provider marks `value` as sensitive in plan output; `ignore_changes` is for ignoring future updates to the configured attribute. Updated the comment to say it prevents Terraform from overwriting values changed outside Terraform.
- The Python example used a single `get_parameters_by_path` call while saying it gets all parameters under a path. AWS returns `GetParametersByPath` results in pages and may return a `NextToken`. Updated the example to use the boto3 paginator.
- The Node.js example used one `GetParametersByPathCommand` call while saying it loads all parameters under a path. Updated it to use the AWS SDK for JavaScript v3 `paginateGetParametersByPath` paginator.

## Review Notes
- The Terraform examples use AWS provider `~> 5.0`, which is not the current latest major version as of this validation, but the resource arguments shown remain valid and non-deprecated for the covered usage.
- The multi-environment example uses `ignore_changes = [value]` for every generated parameter, so future Terraform value changes for non-secret parameters would also be ignored. That is technically valid, but teams may prefer splitting secrets and non-secrets into separate resources when they want Terraform to keep managing non-secret config values.

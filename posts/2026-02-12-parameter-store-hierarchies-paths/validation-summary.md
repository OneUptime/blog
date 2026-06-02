# Validation Summary: How to Use Parameter Store Hierarchies and Paths

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Systems Manager Parameter Store
- AWS CLI
- AWS Identity and Access Management (IAM)
- Python
- Boto3

## Sources Consulted
- AWS Systems Manager User Guide: Working with parameter hierarchies in Parameter Store - https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html
- AWS Systems Manager User Guide: Creating Parameter Store parameters - https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-su-create.html
- AWS CLI Command Reference: ssm get-parameters-by-path - https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameters-by-path.html
- AWS CLI Command Reference: ssm describe-parameters - https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-parameters.html
- AWS CLI Command Reference: ssm put-parameter - https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS Systems Manager IAM documentation - https://docs.aws.amazon.com/systems-manager/latest/userguide/security_iam_service-with-iam.html
- Boto3 SSM client documentation: put_parameter - https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/put_parameter.html

## Issues Found
- The opening description said a parameter path "works exactly like directory paths" and that `/myapp/production/database/host` has four levels. AWS documentation distinguishes the hierarchy path from the final parameter name component, so the wording was changed to describe slash-delimited components and the hierarchy path more precisely.
- One query example said it fetched config for "all apps" while the command queried only `/myapp`. The comment was corrected to "all config for myapp."
- The examples used 9-digit placeholder AWS account IDs in IAM resource ARNs. AWS account IDs are 12 digits in canonical ARN examples, so the placeholders were changed to `123456789012`.
- The examples used Parameter Store as a feature-flag store. AWS currently recommends AWS AppConfig rather than Parameter Store for feature flags and dynamic configuration, so the example was changed to a simple application setting.

## Review Notes
The AWS CLI commands, `--recursive`, `--with-decryption`, `describe-parameters` `Path` filter syntax, IAM path resource examples, and Boto3 paginator usage are otherwise consistent with the official documentation. The author, OneUptime, and related OneUptime blog links returned HTTP 200 during review. Readers using `SecureString` parameters should also ensure their IAM policies and KMS key policies allow the required decrypt operations.

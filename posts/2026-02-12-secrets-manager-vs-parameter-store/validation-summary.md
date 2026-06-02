# Validation Summary: How to Use Secrets Manager vs Parameter Store

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS CLI
- Boto3 for Python
- Amazon ECS task definitions
- AWS Lambda Parameters and Secrets Extension
- AWS KMS

## Sources Consulted
- AWS Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/
- AWS Secrets Manager quotas: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_limits.html
- AWS Secrets Manager rotation documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
- AWS CLI `replicate-secret-to-regions` reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/secretsmanager/replicate-secret-to-regions.html
- AWS Systems Manager Parameter Store documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS Systems Manager pricing for Parameter Store: https://aws.amazon.com/systems-manager/pricing/
- AWS Systems Manager Parameter Store quotas: https://docs.aws.amazon.com/general/latest/gr/ssm.html
- AWS Systems Manager Parameter Store throughput documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-throughput.html
- AWS Systems Manager `GetParametersByPath` API reference: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html
- Boto3 `get_parameters_by_path` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/get_parameters_by_path.html
- Amazon ECS Secrets Manager environment variable documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- AWS Parameters and Secrets Lambda Extension documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- AWS AppConfig documentation: https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html

## Issues Found
- Corrected the opening wording from "both services store sensitive values securely" to "both services can store sensitive values securely" because Parameter Store supports plaintext `String` values as well as encrypted `SecureString` values.
- Replaced feature-flag-oriented Parameter Store recommendations with static application settings. AWS currently recommends AWS AppConfig for feature flags and dynamic configuration.
- Corrected Parameter Store throughput wording. Higher throughput is not exclusively an Advanced-tier feature; it applies to both Standard and Advanced parameters, adds API interaction charges, and has different TPS limits by API.
- Fixed the split cost example. The original calculation used an incorrect Secrets Manager API-call line item and total. The corrected example uses 1 million Secrets Manager API calls at $0.05 per 10,000 calls, for a $25/month total and about 76% savings.
- Changed the Secrets Manager create command comment so it no longer implies that `create-secret` enables rotation by itself.
- Updated the Parameter Store path-fetching explanation so it does not imply one API call always returns every parameter.
- Fixed the boto3 `get_parameters_by_path` example to use a paginator. The API returns a maximum of 10 results per call and may return `NextToken`.
- Updated the ECS Secrets Manager ARN example to include the generated suffix segment used in Secrets Manager ARNs before the JSON key selector.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI examples were verified against official AWS CLI and AWS service documentation rather than local `--help` output. The Lambda extension example is technically valid only for Lambda functions that include the AWS Parameters and Secrets Lambda Extension layer and call it during the invoke phase.

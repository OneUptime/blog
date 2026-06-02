# Validation Summary: How to Implement Serverless Security Best Practices on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- AWS IAM
- Amazon DynamoDB
- Amazon S3
- Amazon CloudWatch Logs
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon API Gateway
- Amazon GuardDuty
- AWS X-Ray
- Terraform AWS provider
- Python 3.12
- Boto3
- GitHub Actions
- Safety CLI
- Bandit
- detect-secrets

## Sources Consulted
- AWS Lambda environment variables documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda Secrets Manager integration documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS managed policy reference for AWSLambdaBasicExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html
- Amazon GuardDuty Lambda Protection documentation: https://docs.aws.amazon.com/guardduty/latest/ug/lambda-protection.html
- Amazon GuardDuty Lambda Network Activity Monitoring configuration documentation: https://docs.aws.amazon.com/guardduty/latest/ug/configure-lambda-protection-multi-acc-env.html
- Amazon API Gateway request validation documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html
- Terraform AWS provider documentation for aws_lambda_function: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider documentation for aws_api_gateway_method_settings: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- Safety CLI command documentation: https://docs.safetycli.com/safety-docs/safety-cli/scanning-for-vulnerable-and-malicious-packages/available-commands-and-inputs
- Bandit command line documentation: https://bandit.readthedocs.io/en/latest/man/bandit.html
- detect-secrets documentation: https://github.com/Yelp/detect-secrets
- GitHub Actions Python documentation: https://docs.github.com/actions/guides/building-and-testing-python

## Issues Found
- The Python input validation example could raise exceptions when the parsed JSON body was not an object, or when an `items` array element was not an object. Added type checks so invalid input returns a 400 validation response instead of crashing.
- The input validation function described sanitization but did not write the normalized `customer_id` value back into the returned data. Updated the example to store the normalized string after validation.
- The secrets management section overstated Lambda environment variable exposure. AWS encrypts Lambda environment variables at rest, but AWS recommends Secrets Manager for sensitive values. Reworded the paragraph to say the risk is access through function configuration permissions and infrastructure templates or state files.
- The GitHub Actions example used `safety check`, which Safety CLI documents as deprecated and replaced by `safety scan`. Updated the workflow to use `safety scan --save-as json safety-report.json` and `safety scan`.
- The API Gateway Terraform comment claimed the snippet included WAF and authorization, but the shown resources only configure throttling and request validation. Updated the comment to match the actual configuration.

## Review Notes
- The IAM, Lambda resource controls, API Gateway method settings, Bandit command, detect-secrets command syntax, and GuardDuty `LAMBDA_NETWORK_LOGS` feature name were consistent with the consulted documentation.
- The API Gateway request validator resource is valid, but a complete production example would also attach the validator to methods and configure request models for body validation.

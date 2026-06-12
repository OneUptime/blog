# Validation Summary: How to Implement Lambda Extensions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda Extensions
- AWS Lambda Extensions API
- AWS Lambda Telemetry API
- AWS Lambda Layers
- AWS CLI
- Terraform AWS provider
- Go
- Node.js
- AWS Secrets Manager SDK for Go v2

## Sources Consulted
- AWS Lambda: Augment Lambda functions using Lambda extensions: https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html
- AWS Lambda: Using the Lambda Extensions API to create extensions: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS Lambda: Accessing real-time telemetry data for extensions using the Telemetry API: https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api.html
- AWS Lambda: Lambda Telemetry API reference: https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api-reference.html
- AWS Lambda: Telemetry API Event schema reference: https://docs.aws.amazon.com/lambda/latest/dg/telemetry-schema-reference.html
- AWS CLI: publish-layer-version command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/publish-layer-version.html
- AWS CLI: update-function-configuration command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- Terraform AWS provider: aws_lambda_layer_version resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version

## Issues Found
- The lifecycle diagram described an extension as sending a generic "Ready" message. Changed this to `GET /extension/event/next`, because the Extensions API uses the blocking Next call both to signal completion and receive the next lifecycle event.
- The project structure comment said the extension executable must match the directory name. Changed it to say it must match `Lambda-Extension-Name`, which AWS validates against the extension executable's full file name.
- The Go external extension client used a 30-second timeout for all Extension API calls. Removed the timeout because AWS explicitly says not to set a timeout on the blocking `GET /extension/event/next` call.
- The Telemetry API example used schema version `2022-07-01`. Updated it to `2025-01-29`, which AWS recommends for new extensions and requires for Lambda Managed Instances while remaining backward compatible with default Lambda functions.
- The Telemetry API destination URI used `http://sandbox:<port>`. Changed it to `http://sandbox.localdomain:<port>`, matching AWS's documented local HTTP destination format.

## Review Notes
The AWS CLI layer publishing and function configuration commands use current documented flags and valid runtime/architecture values. The Terraform layer resource fields are consistent with the Terraform AWS provider documentation. I could not run a local Go compile check because `go` is not installed in this environment.

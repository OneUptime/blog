# Validation Summary: How to Implement AWS Lambda Extensions Custom

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda extensions
- AWS Lambda Extensions API
- AWS Lambda Telemetry API
- AWS Lambda layers and container images
- AWS SAM
- AWS CLI
- Lambda Runtime Interface Emulator
- Go
- Python
- AWS SDK for Go v2
- AWS Secrets Manager
- Docker

## Sources Consulted
- AWS Lambda: Using the Lambda Extensions API to create extensions: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS Lambda: Augment Lambda functions using Lambda extensions: https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html
- AWS Lambda: Understanding the Lambda execution environment lifecycle: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda: Modifying the runtime environment: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-modify.html
- AWS Lambda: Lambda Telemetry API reference: https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api-reference.html
- AWS Lambda: Accessing real-time telemetry data for extensions using the Telemetry API: https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api.html
- AWS Lambda: Deploy Go Lambda functions with container images: https://docs.aws.amazon.com/lambda/latest/dg/go-image.html
- AWS Lambda: Deploy Python Lambda functions with container images: https://docs.aws.amazon.com/lambda/latest/dg/python-image.html
- AWS SDK for Go v2 Secrets Manager API: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/secretsmanager

## Issues Found
- The introduction stated that Lambda extensions run as separate processes. This is only true for external extensions; internal extensions run as part of the runtime process. Updated the wording to distinguish both extension types.
- The post said extensions are packaged as Lambda layers. External extensions can also be included in container images under `/opt/extensions`. Updated the packaging claim.
- The external extension table implied external extensions receive `INIT` events. The Extensions API uses registration during initialization and delivers `INVOKE` and `SHUTDOWN` events. Updated the table wording.
- The external extension project structure said the executable must match the folder name. AWS validates the `Lambda-Extension-Name` header against the extension file name. Updated the comment.
- The internal extension activation example pointed `AWS_LAMBDA_EXEC_WRAPPER` at a Python handler module. AWS requires this variable to point to an executable script or binary that starts the runtime. Updated the section to distinguish a Python handler-wrapper pattern from an executable exec-wrapper script.
- The Telemetry API subscription code only accepted HTTP 200. AWS documents HTTP 202 as the accepted response in local testing. Updated the code to accept both 200 and 202.
- The secrets caching Go snippet referenced `splitAndTrim` without defining it and could panic on binary secrets where `SecretString` is nil. Added the missing helper, `strings` import, and nil check.
- The local RIE command mixed the standalone RIE entrypoint pattern with an AWS Lambda base image and set `AWS_LAMBDA_RUNTIME_API` manually. Updated the command to use the supported AWS base-image local run pattern.
- The ARM64 build guidance suggested placing multiple architecture-specific executables under `/extensions`. Lambda starts executables in that directory, so a wrong-architecture binary there can fail. Updated the example to create separate layer artifacts with the same executable name.

## Review Notes
- Python snippets were parsed with `ast` successfully.
- Go was not installed in the review environment, so Go examples were reviewed against AWS documentation and Go syntax rules but not compiled locally.

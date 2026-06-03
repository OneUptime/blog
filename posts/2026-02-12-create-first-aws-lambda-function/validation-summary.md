# Validation Summary: How to Create Your First AWS Lambda Function

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS IAM
- AWS CLI
- Amazon CloudWatch Logs
- Lambda Function URLs
- Python
- Node.js
- JSON

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda execution environment lifecycle: https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html
- AWS Lambda Python handler documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html
- AWS Lambda Python context object documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-context.html
- AWS Lambda Function URL authorization: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda environment variables: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS CLI lambda create-function reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI lambda invoke reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS CLI lambda update-function-code reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-code.html
- Python datetime documentation: https://docs.python.org/3.12/library/datetime.html

## Issues Found
- The runtime list included deprecated or no-longer-current Lambda managed runtimes such as Python 3.9, Node.js 18.x, Node.js 20.x, .NET 6, and Ruby 3.2, and omitted current runtimes such as Python 3.14, Node.js 24.x, Java 25, .NET 10, Ruby 3.4, and Ruby 4.0. Updated the list to match the current AWS Lambda runtime table.
- The post said the Lambda container is destroyed after the function finishes. AWS documents that Lambda can freeze and reuse an execution environment after an invocation, and may shut it down after inactivity. Updated the explanation to describe freezing, reuse, and eventual shutdown accurately.
- The Python example used `datetime.utcnow()` with the `python3.12` runtime. Python 3.12 deprecates `datetime.utcnow()`. Replaced it with `datetime.now(timezone.utc)`.
- The Function URL section called a Lambda Function URL an API Gateway trigger. A Function URL is a Lambda-managed HTTPS endpoint, not API Gateway. Reworded the sentence while preserving the beginner-friendly flow.
- The Function URL public access command only granted `lambda:InvokeFunctionUrl`. AWS documentation now requires new Function URLs to have both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions, added as separate policy statements when using the AWS CLI. Added the missing `lambda:InvokeFunction` permission with `--invoked-via-function-url`.

## Review Notes
- The direct invocation, handler signatures, context usage, IAM role setup, basic execution policy attachment, function creation, code update, environment variable, and CloudWatch Logs commands are consistent with AWS documentation.
- The API Gateway event example is a simplified REST-style payload. Future revisions could clarify that HTTP API payload format 2.0 uses a different shape, but the existing example is acceptable as a beginner-oriented illustration.

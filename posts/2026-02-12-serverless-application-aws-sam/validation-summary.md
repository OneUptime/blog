# Validation Summary: Build a Serverless Application with AWS SAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Serverless Application Model (SAM)
- AWS SAM CLI
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB and DynamoDB Local
- AWS CloudFormation
- AWS SDK for JavaScript v3
- Node.js
- Docker

## Sources Consulted
- AWS SAM CLI installation documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
- AWS SAM CLI Homebrew management documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/manage-sam-cli-versions.html
- AWS Lambda runtime support documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS SAM `AWS::Serverless::Function` resource documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM policy templates documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-templates.html
- AWS SAM CORS configuration documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-corsconfiguration.html
- AWS SAM `sam local start-api` documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-api.html
- AWS SAM `sam local invoke` command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html
- AWS SAM deployment documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html
- AWS SAM `sam sync` command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-sync.html
- AWS SAM layer build documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/building-layers.html
- Amazon DynamoDB Local documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html
- AWS SDK for JavaScript v3 DynamoDB document client documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS Lambda CloudWatch Logs documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions-logs.html

## Issues Found
- The Linux install command used `pip install aws-sam-cli`, which is no longer the AWS-documented first-party install method. Replaced it with the official Linux zip installer flow and clarified that the macOS Homebrew command uses the community formula.
- The examples used `nodejs20.x`, which AWS Lambda lists as deprecated as of April 30, 2026. Updated the SAM template and layer example to `nodejs22.x`, a currently supported Lambda runtime.
- The `sam local start-api` reload statement was too broad. Clarified that automatic reflection of code changes applies when SAM reads source directly, and that projects built with `sam build` need another `sam build` before local commands pick up changes.
- The DynamoDB Local endpoint example used `host.docker.internal`, which is not portable for SAM's Linux-based Docker containers. Updated the example to use a shared Docker network, a named `dynamodb-local` container, `--docker-network`, and the container hostname endpoint.
- The monitoring section implied CloudWatch logging is enabled through `Globals`. Updated it to state that X-Ray tracing can be enabled through `Globals`, while Lambda sends logs to CloudWatch Logs when the execution role has the required permissions.

## Review Notes
The local environment did not have `sam` or `aws` installed, so SAM CLI and AWS CLI behavior was verified against official AWS documentation rather than local `--help` output. The JavaScript snippets were extracted from the Markdown and passed `node --check` with Node.js v22.22.0.

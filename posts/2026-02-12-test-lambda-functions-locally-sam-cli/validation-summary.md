# Validation Summary: How to Test Lambda Functions Locally with SAM CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS SAM CLI
- AWS Serverless Application Model templates
- Docker
- API Gateway local emulation
- DynamoDB Local
- AWS SDK for JavaScript v3
- AWS CLI
- VS Code debugging

## Sources Consulted
- AWS SAM CLI installation documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
- AWS SAM Docker prerequisite documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-docker.html
- AWS SAM local invoke command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html
- AWS SAM local invoke guide, including stdin events and env var files: https://docs.aws.amazon.com/en_us/serverless-application-model/latest/developerguide/serverless-sam-cli-using-invoke.html
- AWS SAM local start-api command reference and warm container behavior: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-start-api.html
- AWS SAM local generate-event guide and command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-generate-event.html
- AWS SAM local debugging guide: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-debugging.html
- AWS SAM sync command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-sync.html
- AWS SAM DynamoDB event example: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-example-ddb.html
- AWS Lambda runtime support table: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Docker Desktop networking documentation for `host.docker.internal`: https://docs.docker.com/desktop/features/networking/networking-how-tos/

## Issues Found
- The installation section said SAM CLI requires Python and recommended `pip install aws-sam-cli` and Chocolatey as general install commands. AWS now documents first-party installers and lists Docker separately as the local testing requirement. Updated the prerequisite wording and replaced the Linux/Windows examples with current installer guidance while keeping Homebrew explicitly labeled as community-managed.
- The DynamoDB Local section stated that `host.docker.internal` is how Docker containers reach host services without qualification. Docker documents this hostname for Docker Desktop; Linux Docker Engine may need an explicit host mapping or a shared Docker network. Added that caveat.
- The SAM Accelerate section said `sam sync` deploys changes instantly without a full CloudFormation deployment. AWS documents an initial sync and CloudFormation use for infrastructure changes, with direct service API updates for code changes. Reworded this to reflect the actual behavior.
- The Lambda layer section said SAM CLI pulls layers automatically during local invocation. For local layer resources, SAM builds/includes them; referenced layers may be downloaded. Updated the wording to cover both cases.
- The SAM template examples used `nodejs20.x`, which AWS lists as a deprecated Lambda runtime as of April 30, 2026. Updated the examples to `nodejs24.x`, a currently supported Lambda runtime.

## Review Notes
The remaining commands and snippets are consistent with AWS SAM CLI documentation: `sam local invoke` supports event files and stdin, `--env-vars` accepts per-function JSON, `sam local start-api` supports `--warm-containers EAGER`, `sam local generate-event` supports the listed service/event patterns, and `--debug-port` is documented for local debugging.

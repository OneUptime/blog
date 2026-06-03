# Validation Summary: How to Deploy Lambda Functions with AWS SAM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SAM
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon SQS
- AWS CloudFormation
- AWS SAM CLI
- Python 3.12
- Boto3
- GitHub Actions

## Sources Consulted
- AWS SAM CLI installation documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
- AWS SAM CLI `sam init` command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-init.html
- AWS SAM `AWS::Serverless::Function` documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM generated CloudFormation resources documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-generated-resources-function.html
- AWS SAM policy templates documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-templates.html
- AWS SAM SQS event source documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-sqs.html
- AWS SAM build documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-build.html
- AWS SAM deploy documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html
- AWS SAM local event generation documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-generate-event.html
- AWS SAM logs documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-logging.html
- Python 3.12 documentation for deprecated `datetime.utcnow()`: https://docs.python.org/3.12/whatsnew/3.12.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS `setup-sam` GitHub Action documentation: https://github.com/aws-actions/setup-sam
- GitHub `actions/checkout` documentation: https://github.com/actions/checkout
- GitHub `actions/setup-python` documentation: https://github.com/actions/setup-python
- AWS `configure-aws-credentials` GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The installation snippet used `pip install aws-sam-cli` for Linux and Homebrew for macOS. AWS now documents first-party installers as the recommended installation path and notes that the AWS-managed Homebrew installer is no longer maintained, so the snippet was updated to use the macOS package installer and Linux zip installer.
- The `sam init` command could still prompt interactively because it omitted `--no-interactive` and `--dependency-manager pip`. Added both flags so the command matches the described non-interactive project generation flow.
- The Lambda code read `ORDERS_TABLE`, but the SAM template did not define that environment variable. Added `ORDERS_TABLE: !Ref OrdersTable` to the function globals so the code writes to the table created by the template.
- The SQS-triggered Lambda was missing `SQSPollerPolicy`, which grants the function permission to poll the queue. Added `SQSPollerPolicy` with `QueueName: !GetAtt OrderQueue.QueueName` to `ProcessOrderFunction`.
- The post said `AWS::Serverless::Function` automatically creates a log group. AWS SAM always generates the Lambda function and can generate roles and event source mappings, but it does not always generate an explicit CloudWatch Logs log group resource. Updated the wording.
- The Python 3.12 code used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(UTC)`.
- The GitHub Actions example used older major versions of official actions. Updated `actions/checkout`, `actions/setup-python`, `aws-actions/setup-sam`, and `aws-actions/configure-aws-credentials` to current major versions from their official documentation.

## Review Notes
- The CI/CD example still uses long-lived AWS access key secrets. It is technically valid, but AWS and the official credential action documentation generally recommend following IAM best practices, commonly using short-lived credentials through OIDC for GitHub Actions.

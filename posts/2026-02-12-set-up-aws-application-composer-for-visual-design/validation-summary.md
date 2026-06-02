# Validation Summary: How to Set Up AWS Application Composer for Visual Design

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Infrastructure Composer
- AWS CloudFormation
- AWS Serverless Application Model (AWS SAM)
- AWS Toolkit for Visual Studio Code
- Amazon API Gateway REST APIs
- AWS Lambda
- Amazon DynamoDB
- Amazon SQS
- Python 3.12
- Boto3
- SAM CLI

## Sources Consulted
- AWS announcement: AWS Application Composer is now AWS Infrastructure Composer: https://aws.amazon.com/about-aws/whats-new/2024/10/aws-application-composer-infrastructure-composer/
- AWS Infrastructure Composer Developer Guide, What is AWS Infrastructure Composer?: https://docs.aws.amazon.com/infrastructure-composer/latest/dg/what-is-composer.html
- AWS Toolkit for Visual Studio Code User Guide, AWS Infrastructure Composer: https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/infrastructure-composer.html
- AWS CloudFormation User Guide, Create templates visually with Infrastructure Composer: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/infrastructure-composer-for-cloudformation.html
- AWS SAM Developer Guide, AWS::Serverless::Api: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-api.html
- AWS SAM Developer Guide, CorsConfiguration: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-corsconfiguration.html
- AWS SAM Developer Guide, AWS::Serverless::Function: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM Developer Guide, SQS event source: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-sqsevent.html
- AWS SAM Developer Guide, Policy template list: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html
- Amazon API Gateway Developer Guide, Lambda proxy integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS Lambda Developer Guide, Building Lambda functions with Python: https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html
- AWS Lambda Developer Guide, Supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CloudFormation User Guide, AWS::DynamoDB::Table: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
- AWS CloudFormation User Guide, AWS::SQS::Queue: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sqs-queue.html
- AWS SAM CLI Command Reference, sam build: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html
- AWS SAM CLI Command Reference, sam deploy: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
- AWS SAM CLI Command Reference, sam sync: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-sync.html

## Issues Found
- The post used the outdated service name "AWS Application Composer" throughout. AWS renamed the service to "AWS Infrastructure Composer" on October 4, 2024. Updated the title, tags, description, headings, and body text to use the current service name while preserving one "formerly AWS Application Composer" note for clarity.
- The post said the service is available in two places. Current AWS documentation lists Infrastructure Composer access from the Infrastructure Composer console, AWS Toolkit for Visual Studio Code, and CloudFormation console mode. Updated the access list accordingly.
- The VS Code opening instructions used outdated wording for the command flow. Updated them to reference the Infrastructure Composer button or command, and kept the documented right-click label "Open with App Composer" for template files.
- The post stated that Infrastructure Composer creates placeholder function code as an absolute behavior. AWS documentation describes starter/local-sync workflows, so the wording was softened to "If Infrastructure Composer saves starter function code for your project."
- The Lambda examples enabled CORS on the SAM API but did not return `Access-Control-Allow-Origin` from Lambda proxy responses. API Gateway documentation requires proxy backends to return CORS headers. Added `Access-Control-Allow-Origin: *` to the successful and 404 responses.
- The claim that generated IAM policies are least-privilege was too broad. Updated it to "scoped policies based on supported connections" to better match AWS documentation and avoid overstating the guarantee.

## Review Notes
- Python code blocks were syntax-checked locally with Python 3.12.
- `sam` and `cfn-lint` were not installed in the local environment, so full SAM template validation could not be run locally. Template resource types, properties, event definitions, CORS configuration, and policy template names were checked against AWS documentation instead.

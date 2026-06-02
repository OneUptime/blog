# Validation Summary: Use Step Functions for Orchestrating Serverless Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- AWS Lambda
- AWS Serverless Application Model
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- Amazon CloudWatch

## Sources Consulted
- AWS Step Functions: Task workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions: Invoke an AWS Lambda function with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions: Handling errors in Step Functions workflows - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS Step Functions: Processing input and output - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-input-output-filtering.html
- AWS Step Functions: Manipulate parameters in workflows - https://docs.aws.amazon.com/step-functions/latest/dg/input-output-inputpath-params.html
- AWS SAM: AWS::Serverless::StateMachine - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-statemachine.html
- AWS SAM: Policy template list - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html
- AWS Lambda: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda: Building Lambda functions with Node.js - https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS SDK for JavaScript v3: Step Functions examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sfn_code_examples.html
- AWS Step Functions: Monitoring Step Functions metrics using CloudWatch - https://docs.aws.amazon.com/step-functions/latest/dg/procedure-cw-metrics.html

## Issues Found
- The SAM template used the `nodejs20.x` Lambda runtime. AWS Lambda lists Node.js 20 as deprecated as of April 30, 2026, so the example no longer used a current non-deprecated runtime on the validation date. Changed the runtime values to `nodejs22.x`.
- The input/output processing example used `InputPath: "$.items"`, which would pass an array directly to the Lambda. The earlier `checkInventory` handler expects an object with an `items` property, so that example would not work as written. Changed the state to use `Parameters` with `items.$` and `orderId.$`, preserving the expected object shape while still demonstrating data selection.

## Review Notes
The direct Lambda ARN Task examples, custom Lambda error name handling, retry/catch usage, SAM state machine properties, JavaScript SDK v3 `StartExecutionCommand` usage, and CloudWatch monitoring recommendation are consistent with AWS documentation. The internal OneUptime link points to an existing local post path.

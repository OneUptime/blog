# Validation Summary: How to Use SES with Lambda for Email Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SES email receiving
- AWS Lambda
- Amazon S3
- Amazon DynamoDB
- Amazon SQS dead-letter queues
- AWS CloudFormation
- AWS CLI
- Python 3.12
- Boto3
- Python email package

## Sources Consulted
- Amazon SES Developer Guide: Sample incoming email event: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-lambda-event.html
- Amazon SES Developer Guide: Invoke Lambda function action: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-lambda.html
- Amazon SES Developer Guide: Deliver to S3 bucket action: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-s3.html
- Amazon SES Developer Guide: Giving permissions to Amazon SES for email receiving: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-permissions.html
- Amazon SES API Reference: LambdaAction: https://docs.aws.amazon.com/ses/latest/APIReference/API_LambdaAction.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function Code: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html
- AWS CLI Command Reference: lambda update-function-configuration: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- Boto3 SES Client send_email reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_email.html
- Boto3 DynamoDB Table update_item reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/update_item.html
- Python 3.12 email.message documentation: https://docs.python.org/3.12/library/email.message.html

## Issues Found
- The CloudFormation `AWS::Lambda::Function` example omitted the required `Code` property, so the resource would not create a deployable Lambda function. Added a minimal inline `ZipFile` handler and clarified that it should be replaced with the processor code or an S3 deployment package.
- The code fetched messages from `incoming/{message_id}` but did not state that the SES S3 action must use `incoming` as its object key prefix or run before the Lambda action. Added that setup requirement so the Lambda lookup matches SES delivery behavior.
- The router called `handle_order_email` and `handle_unsubscribe`, but the post did not define those functions. Added minimal placeholder handlers so the code path is complete and does not raise `NameError`.

## Review Notes
- The Python snippets compile under Python 3, and the CloudFormation YAML parses with CloudFormation intrinsic tags.
- Lambda dead-letter queues apply to asynchronous invocations. This matches the SES Lambda action default and recommended `Event` invocation type, but synchronous `RequestResponse` receipt-rule actions have different behavior and a 30-second timeout.

# Validation Summary: How to Integrate Amazon Lex with Lambda for Fulfillment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon Lex V2
- AWS CLI
- IAM
- Python
- CloudWatch Logs

## Sources Consulted
- Amazon Lex V2 Developer Guide: Integrating an AWS Lambda function into your Amazon Lex V2 bot: https://docs.aws.amazon.com/lexv2/latest/dg/lambda.html
- Amazon Lex V2 Developer Guide: AWS Lambda input event format for Lex V2: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-input-format.html
- Amazon Lex V2 Developer Guide: AWS Lambda response format for Lex V2: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-response-format.html
- Amazon Lex V2 Developer Guide: Attach an AWS Lambda function to a bot using API operations: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-attach-api.html
- Amazon Lex V2 Developer Guide: Attach an AWS Lambda function to a bot using the console: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-attach-console.html
- AWS CLI Command Reference: lexv2-models update-intent: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/update-intent.html
- AWS CLI Command Reference: lexv2-models update-bot-alias: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/update-bot-alias.html
- AWS Lambda Developer Guide: Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The Lex V2 event example was fenced as JSON but included a `//` comment, which is not valid JSON. Removed the comment so the snippet is syntactically valid JSON.
- The Lex V2 event example used `text/plain` for `responseContentType`. AWS documents the text response content type as `text/plain; charset=utf-8`, so the example was updated.
- The console instructions said to select the Lambda function in the intent Fulfillment section. AWS Lex V2 associates the Lambda function at the bot alias language level, while the intent Fulfillment section enables use of the code hook. Updated the wording to enable the fulfillment Lambda hook without implying alias-level function selection happens there.
- The CLI example enabled the fulfillment hook but did not set `active`. AWS documents `active` as the setting that determines whether the fulfillment hook runs, so the CLI example now sets both `enabled` and `active` to `true`.

## Review Notes
The AWS CLI examples match the current Lex V2 and Lambda command shapes. Python 3.12 remains a supported AWS Lambda managed runtime as of this validation date. The post intentionally uses scalar Lex slots; list or composite slots would require broader slot parsing logic.

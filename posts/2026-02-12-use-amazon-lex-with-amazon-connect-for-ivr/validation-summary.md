# Validation Summary: How to Use Amazon Lex with Amazon Connect for IVR

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Lex V2
- Amazon Connect
- AWS CLI
- AWS Lambda
- Python
- DynamoDB
- IVR and contact flows

## Sources Consulted
- Amazon Lex V2 create-bot AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/create-bot.html
- Amazon Lex V2 create-slot AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/create-slot.html
- Amazon Lex V2 create-bot-alias AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/create-bot-alias.html
- Amazon Lex V2 Lambda attachment guide: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-attach-api.html
- Amazon Lex V2 Lambda response format: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-response-format.html
- Amazon Lex V2 Lambda common structures: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-common-structures.html
- Amazon Connect AssociateBot API reference: https://docs.aws.amazon.com/connect/latest/APIReference/API_AssociateBot.html
- Amazon Connect AssociateLexBot API reference: https://docs.aws.amazon.com/connect/latest/APIReference/API_AssociateLexBot.html
- Amazon Connect Get customer input block documentation: https://docs.aws.amazon.com/connect/latest/adminguide/get-customer-input.html
- Amazon Lex V2 list-utterance-analytics-data AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/list-utterance-analytics-data.html

## Issues Found
- The Amazon Connect association command used `aws connect associate-lex-bot`, which only supports Amazon Lex V1 bots. Changed it to `aws connect associate-bot` with the Lex V2 bot alias ARN via `--lex-v2-bot`.
- The Lex V2 alias creation command did not attach the Lambda fulfillment hook, even though the intent enabled `fulfillment-code-hook`. Added `--bot-alias-locale-settings` with `lambdaCodeHook`, `lambdaARN`, and `codeHookInterfaceVersion`.
- The Python Lambda sample referenced `handle_reset_password(event)`, but no `ResetPassword` intent or handler was defined in the post. Removed that branch so the example code does not contain an undefined function path.
- The post described the human-handoff intent as a fallback intent, but the sample creates a normal transfer intent rather than the built-in Amazon Lex fallback intent. Reworded the sentence to describe it as an agent transfer intent.

## Review Notes
- The AWS CLI was not installed locally, so command verification was performed against official AWS CLI and service documentation.
- The post remains a tutorial-level walkthrough. A production deployment would also need concrete Lambda packaging/deployment, IAM permissions, and resource names specific to the reader's AWS account.

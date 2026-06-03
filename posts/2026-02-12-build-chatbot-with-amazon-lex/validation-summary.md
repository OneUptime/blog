# Validation Summary: How to Build a Chatbot with Amazon Lex

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Lex V2
- AWS SDK for Python (boto3)
- AWS CLI
- AWS Lambda
- Amazon CloudWatch
- Amazon Connect
- Facebook Messenger, Slack, and Twilio SMS channel integrations
- Mermaid diagrams

## Sources Consulted
- Amazon Lex V2 Developer Guide: What is Amazon Lex V2? https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html
- Amazon Lex V2 Developer Guide: Adding intents https://docs.aws.amazon.com/lexv2/latest/dg/add-intents.html
- Amazon Lex V2 Developer Guide: Slots https://docs.aws.amazon.com/lexv2/latest/dg/intent-slots.html
- Amazon Lex V2 Developer Guide: AMAZON.FallbackIntent https://docs.aws.amazon.com/lexv2/latest/dg/built-in-intent-fallback.html
- Amazon Lex V2 Developer Guide: Testing a bot using the console https://docs.aws.amazon.com/lexv2/latest/dg/test-bot.html
- Amazon Lex V2 Developer Guide: Versioning and aliases https://docs.aws.amazon.com/lexv2/latest/dg/versions-aliases.html
- Boto3 LexRuntimeV2 recognize_text documentation https://docs.aws.amazon.com/boto3/latest/reference/services/lexv2-runtime/client/recognize_text.html
- AWS CLI lexv2-runtime recognize-text command reference https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lexv2-runtime/recognize-text.html
- Amazon Lex V2 Developer Guide: Integrating with messaging platforms https://docs.aws.amazon.com/lexv2/latest/dg/deploying-messaging-platform.html
- Amazon Lex V2 Developer Guide: Connect Customer integration https://docs.aws.amazon.com/lexv2/latest/dg/contact-center-connect.html
- Amazon Lex V2 Developer Guide: Measuring operational metrics with Amazon CloudWatch https://docs.aws.amazon.com/lexv2/latest/dg/monitoring-cloudwatch.html
- AWS Machine Learning Blog: Interact with an Amazon Lex V2 bot with the AWS CLI, AWS SDK for Python, and AWS SDK for .NET https://aws.amazon.com/blogs/machine-learning/interact-with-an-amazon-lex2v2-bot-with-the-aws-cli-aws-sdk-for-python-and-aws-sdk-dotnet/

## Issues Found
- The CloudWatch monitoring section listed `MissedUtteranceCount`, which is an Amazon Lex V1 metric name and is not listed in the Amazon Lex V2 CloudWatch metrics documentation. Replaced it with Lex V2 runtime metrics: `RuntimeRequestCount`, `RuntimeUserErrors`, and `RuntimeSucessfulRequestLatency`. The misspelling in `RuntimeSucessfulRequestLatency` is intentional because AWS documents that metric name with that spelling.

## Review Notes
- The boto3 `recognize_text` examples use the current Lex V2 runtime client and required parameters.
- The AWS CLI `lexv2-runtime recognize-text` command and options are current.
- `TSTALIASID` is valid as the test bot alias ID used with the default `TestBotAlias`; production applications should use a bot alias that points to a published version rather than the test alias.

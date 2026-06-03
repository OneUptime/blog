# Validation Summary: How to Configure Amazon Lex Intents and Slots

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon Lex V2
- AWS CLI for Lex V2 model APIs
- Amazon Lex built-in and custom slot types
- Amazon Lex input and output contexts
- AWS Lambda dialog code hooks for Amazon Lex V2
- Amazon Lex analytics, conversation logs, and CloudWatch monitoring

## Sources Consulted
- Amazon Lex V2 built-in slot types: https://docs.aws.amazon.com/lexv2/latest/dg/built-in-slots.html
- Amazon Lex V2 slots and slot priorities: https://docs.aws.amazon.com/lexv2/latest/dg/intent-slots.html
- Amazon Lex V2 custom slot types and slot value resolution: https://docs.aws.amazon.com/lexv2/latest/dg/custom-slot-types.html
- SlotValueSelectionSetting API reference: https://docs.aws.amazon.com/lexv2/latest/APIReference/API_SlotValueSelectionSetting.html
- SlotValueElicitationSetting API reference: https://docs.aws.amazon.com/lexv2/latest/APIReference/API_SlotValueElicitationSetting.html
- AWS CLI update-slot command reference: https://docs.aws.amazon.com/cli/latest/reference/lexv2-models/update-slot.html
- Amazon Lex V2 wait and continue behavior: https://docs.aws.amazon.com/lexv2/latest/dg/wait-and-continue.html
- Amazon Lex V2 output contexts API reference: https://docs.aws.amazon.com/lexv2/latest/APIReference/API_OutputContext.html
- Amazon Lex V2 Lambda response format: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-response-format.html
- Amazon Lex V2 Lambda common structures: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-common-structures.html
- Amazon Lex V2 intent confidence scores: https://docs.aws.amazon.com/lexv2/latest/dg/using-intent-confidence-scores.html
- Amazon Lex V2 CloudWatch metrics: https://docs.aws.amazon.com/lexv2/latest/dg/monitoring-cloudwatch.html
- Amazon Lex V2 utterance analytics metrics: https://docs.aws.amazon.com/lexv2/latest/APIReference/API_AnalyticsUtteranceMetric.html

## Issues Found
- The custom slot type example and output context example were fenced as JSON but included `//` comments, which are not valid JSON for AWS API/CLI payloads. Removed the comments from the JSON snippets.
- The wait-and-continue response description said it is what the bot says while waiting for user input. In Lex V2, wait-and-continue applies to streaming conversations when the user asks the bot to wait, keep waiting, or resume. Updated the wording to match the documented behavior.
- The monitoring section referred to CloudWatch metrics and a `MissedUtteranceCount` metric. Current Lex V2 CloudWatch operational metrics do not list that metric name; missed utterances are exposed through Lex analytics/utterance metrics and conversation logs. Updated the wording to refer to Lex analytics and conversation logs, with a rising missed utterance count.

## Review Notes
The remaining examples and explanations are consistent with Amazon Lex V2 documentation. The AWS CLI was not installed in the local workspace, so the CLI example was verified against the official AWS CLI command reference rather than local `aws --help` output.

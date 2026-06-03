# Validation Summary: Use EventBridge Archive and Replay for Event Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge archive and replay
- AWS CLI for EventBridge
- EventBridge event patterns
- AWS SAM / CloudFormation
- AWS Lambda with Node.js
- AWS SDK for JavaScript v3
- Amazon DynamoDB Document Client

## Sources Consulted
- AWS CLI `create-archive` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/create-archive.html
- AWS CLI `start-replay` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/start-replay.html
- AWS CLI `describe-archive` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/describe-archive.html
- AWS CLI `list-archives` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/list-archives.html
- AWS CLI `describe-replay` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/describe-replay.html
- Amazon EventBridge archive and replay user guide: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html
- Amazon EventBridge event pattern comparison operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/content-filtering-with-event-patterns.html
- CloudFormation `AWS::Events::Archive` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-archive.html
- AWS SAM `EventBridgeRule` reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-eventbridgerule.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The replay examples used the event bus ARN for `--event-source-arn`. AWS CLI `start-replay` requires the archive ARN, so the replay commands now use `arn:aws:events:us-east-1:123456789012:archive/orders-archive`.
- The post claimed replay can target a different event bus. EventBridge replays archived events only to the source event bus used by the archive, so the section was corrected to replay only to a specific debug rule using `Destination.FilterArns`.
- Example ARNs used a 9-digit account ID. AWS account IDs are 12 digits, so the samples now use `123456789012`.
- The archive status text omitted valid archive states and implied counts update within minutes. It now lists the current states and notes the 24-hour reconciliation period for count/size values.
- The SAM sample used `nodejs20.x`, which is past its AWS Lambda deprecation date as of this review. It now uses `nodejs24.x`.
- The replay monitoring text said `describe-replay` reports the number of events replayed and omitted the `CANCELLING` state. It now matches the CLI output fields and state values.

## Review Notes
The AWS CLI is not installed in this workspace, so command verification was performed against the official AWS CLI documentation instead of local `aws --help` output.

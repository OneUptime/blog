# Validation Summary: Use EventBridge with SaaS Integrations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge partner event sources and partner event buses
- Amazon EventBridge API destinations and connections
- AWS CLI for EventBridge
- AWS SAM / AWS CloudFormation
- AWS Lambda with Node.js
- AWS SDK for JavaScript v3
- Amazon SQS dead-letter queues and targets
- AWS Secrets Manager dynamic references

## Sources Consulted
- Amazon EventBridge User Guide: Receiving events from a SaaS partner: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-saas.html
- Amazon EventBridge API Reference: CreateEventBus: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_CreateEventBus.html
- AWS CLI Command Reference: create-event-bus: https://docs.aws.amazon.com/cli/latest/reference/events/create-event-bus.html
- Amazon EventBridge Partner Onboarding Guide: https://docs.aws.amazon.com/eventbridge/latest/onboarding/amazon_eventbridge_partner_onboarding_guide.html
- Amazon EventBridge User Guide: API destinations as targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/api-destinations.html
- Amazon EventBridge API Reference: PutTargets and Target: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutTargets.html
- Amazon EventBridge API Reference: RetryPolicy: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_RetryPolicy.html
- AWS CloudFormation: AWS::Events::Connection: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-connection.html
- AWS CloudFormation: AWS::Events::ApiDestination: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-events-apidestination.html
- AWS CloudFormation: AWS::Events::Rule and Target: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- AWS CloudFormation: Secrets Manager dynamic references: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html
- AWS SDK for JavaScript v3: PutEventsCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/eventbridge-2015-10-07/PutEvents

## Issues Found
- Partner event bus creation used `--name shopify-events` with a partner source name. AWS requires a partner event bus name to exactly match the partner event source name. Changed the event bus name, and the later `put-rule` event bus name, to `aws.partner/shopify.com/store-12345/orders`.
- The Shopify event pattern used an exact `source` value of `aws.partner/shopify.com`, but partner events commonly include the full partner source path. Changed it to a prefix match so it matches events from the configured Shopify partner source.
- The post described API destinations as sending to any HTTP endpoint/API. AWS documents API destinations as HTTPS endpoint targets, so the wording was corrected to HTTPS.
- Several example ARNs used a 9-digit account ID and omitted the generated connection/API destination suffix. EventBridge connection and API destination ARNs include a 12-digit account ID and a trailing generated ID. Updated the placeholder ARNs to valid shapes.
- The SAM template referenced `ApiDestRole` without defining it. Added a minimal IAM role with an EventBridge trust policy and `events:InvokeApiDestination` permission for the Slack API destination.
- The SAM template configured a Lambda target without an `AWS::Lambda::Permission` resource allowing EventBridge to invoke it. Added the missing permission resource.
- The SAM template configured an SQS target without a queue policy allowing EventBridge to send messages. Added an `AWS::SQS::QueuePolicy` scoped to the analytics rule.
- The Secrets Manager dynamic reference in the CloudFormation API key example omitted the `SecretString` segment. The default is `SecretString`, but the explicit form is clearer and matches AWS documentation, so it was updated.

## Review Notes
AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and EventBridge API documentation instead of local `aws help` output. The Slack token and Shopify source names remain illustrative placeholders and must be replaced with real values in an actual deployment.

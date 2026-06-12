# Validation Summary: How to Implement Long Polling in SQS

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`)
- TypeScript
- Terraform (illustrative snippets for `aws_sqs_queue` and `aws_cloudwatch_metric_alarm`)
- AWS CloudWatch metrics
- `@smithy/node-http-handler`
- `p-limit` (npm package)
- Mermaid diagrams

## Sources Consulted
- AWS SQS ReceiveMessage API Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- AWS SQS Long Polling Developer Guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-long-polling.html
- AWS SQS Pricing: https://aws.amazon.com/sqs/pricing/
- AWS SQS CreateQueue API (RedrivePolicy attribute) — confirmed `deadLetterTargetArn` and `maxReceiveCount` fields
- AWS SDK for JavaScript v3 — `@aws-sdk/client-sqs` ReceiveMessageCommand input fields

## Issues Found

1. **Cost comparison Mermaid diagram had numbers off by ~10x.**
   The diagram claimed short polling at 86,400 requests/day costs $0.35/day ($10.50/month) and long polling at 4,320 requests/day costs $0.02/day ($0.52/month). At the SQS standard tier price of $0.40 per million requests, the correct figures are:
   - Short polling: 86,400 / 1,000,000 × $0.40 ≈ **$0.035/day (~$1.04/month)**
   - Long polling: 4,320 / 1,000,000 × $0.40 ≈ **$0.0017/day (~$0.05/month)**
   Notably, these incorrect diagram numbers also contradicted the `calculateSQSCosts` TypeScript function in the same section, which uses the correct `(requestsPerDay / 1_000_000) * 0.40` formula. Updated the diagram to match the correct math and the function output. The ~95% relative savings statement remains accurate.

2. **Deprecated `AttributeNames` parameter in `ReceiveMessageCommand`.**
   The AWS SQS API reference explicitly marks `AttributeNames` as deprecated for `ReceiveMessage` and instructs callers to use `MessageSystemAttributeNames` instead. The post used `AttributeNames: ["All"]` in two `ReceiveMessageCommand` code blocks. Replaced both with `MessageSystemAttributeNames: ["All"]` so the examples reflect the current, recommended API surface.

## Review Notes

- All other technical claims check out against AWS documentation:
  - `WaitTimeSeconds` range 0–20 (0 = short poll, 1–20 = long poll) — correct.
  - `MaxNumberOfMessages` valid range 1–10 (default 1) — correct.
  - Default `VisibilityTimeout` of 30s and `MessageRetentionPeriod` of 345600s (4 days) — correct.
  - `ReceiveMessageWaitTimeSeconds` queue attribute name — correct.
  - `RedrivePolicy` JSON structure with `deadLetterTargetArn` and `maxReceiveCount` — correct.
  - CloudWatch metric names (`ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage`, `NumberOfEmptyReceives`, `NumberOfMessagesReceived`) — correct and present in the `AWS/SQS` namespace.
  - HTTP client timeout > `WaitTimeSeconds` advice matches the AWS API reference, which explicitly warns to set HTTP response timeout longer than `WaitTimeSeconds`.
  - SDK v3 import paths and command class names (`SQSClient`, `CreateQueueCommand`, `ReceiveMessageCommand`, `DeleteMessageCommand`, `Message`) are correct.
  - Terraform `aws_sqs_queue` attribute names (`receive_wait_time_seconds`, `visibility_timeout_seconds`, `message_retention_seconds`) are correct for the AWS provider.
- The SQS pricing on the pricing page now references a tiered structure rather than a single flat per-million rate, but $0.40/million for standard queues is still the headline rate cited in AWS calculators and the AWS Pricing API at validation time. The post's TypeScript example explicitly states "first 1M free," which matches the AWS Always Free tier for SQS.
- Stylistic/minor observation (not changed): the cost utility comment notes the free tier but the calculation does not subtract it. Reasonable as an illustrative worst-case estimate.

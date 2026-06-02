# Validation Summary: Use Step Functions Wait State for Delays

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- AWS Lambda
- Amazon SQS delay queues
- JavaScript/Node.js Lambda handlers

## Sources Consulted
- AWS Step Functions Wait workflow state documentation: https://docs.aws.amazon.com/step-functions/latest/dg/state-wait.html
- AWS Step Functions intrinsic functions documentation: https://docs.aws.amazon.com/step-functions/latest/dg/intrinsic-functions.html
- AWS Step Functions workflow type documentation: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions pricing documentation: https://aws.amazon.com/step-functions/pricing/
- AWS Lambda timeout documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- Amazon SQS delay queues documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html

## Issues Found
- The post said "you pay for one state transition, not for the waiting time" without limiting that claim to Standard workflows. AWS pricing documents Standard workflows as state-transition billed, while Express workflows are billed by request count and execution duration. Updated the wording to specify Standard workflows.
- The follow-up scheduling example labeled a fixed UTC-5 calculation as ET and used `setUTCHours(14)` without resetting minutes, seconds, and milliseconds. Updated the comments to EST, changed date mutation to UTC date methods, and reset the time fields when setting 9 AM EST.
- The progressive backoff example used `States.MathMultiply`, which is not a supported Step Functions intrinsic function. AWS documents `States.MathAdd` and `States.MathRandom` for math operations, but not multiplication. Replaced the expression with a supported `States.MathAdd` example.
- The costs section said workflows are billed per state transition rather than per second of execution time. This is only correct for Standard workflows. Updated the section to distinguish Standard billing from Express workflow request and duration billing.

## Review Notes
The JavaScript examples are syntactically valid. For production scheduling across Eastern Time daylight saving changes, use a timezone-aware library or service-side scheduling logic rather than a fixed EST offset.

# Validation Summary: How to Build Parallel Processing Pipelines with Step Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- Step Functions Parallel state
- Step Functions Map state, Inline mode, and Distributed mode
- AWS Lambda task states

## Sources Consulted
- AWS Step Functions Developer Guide: Parallel workflow state, https://docs.aws.amazon.com/step-functions/latest/dg/state-parallel.html
- AWS Step Functions Developer Guide: Map workflow state, https://docs.aws.amazon.com/step-functions/latest/dg/state-map.html
- AWS Step Functions Developer Guide: Using Map state in Inline mode, https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions Developer Guide: Using Map state in Distributed mode, https://docs.aws.amazon.com/step-functions/latest/dg/state-map-distributed.html
- AWS Step Functions Developer Guide: Service quotas, https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- AWS Step Functions Developer Guide: Best practices, https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
- AWS Step Functions Developer Guide: Handling errors in Step Functions workflows, https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- asl-validator 4.0.0, https://www.npmjs.com/package/asl-validator

## Issues Found
- The post described Parallel state as suitable for "2-10 distinct tasks." AWS documents Parallel state as a fixed set of branches but does not define that 2-10 range as a service rule. Changed this to "a small, known set" to avoid presenting guidance as a Step Functions limit.
- The Map state settings list described `MaxConcurrency: 0` as unlimited. Updated this to clarify that it means no additional concurrency limit, while Inline Map still supports up to 40 concurrent iterations.
- The combined Parallel and Map example used Inline Map mode with `MaxConcurrency: 50`. AWS documents Inline Map as supporting up to 40 concurrent iterations. Changed the example to `MaxConcurrency: 40`.
- The partial failure section used `ToleratedFailurePercentage` with Inline Map. AWS documents tolerated failure thresholds for Distributed Map, while Inline Map fails when any iteration fails. Updated the text and snippet to use Distributed Map mode.
- The Lambda retry example used unqualified service error names. Updated it to current Step Functions Lambda service error names: `Lambda.ServiceException`, `Lambda.SdkClientException`, and `Lambda.TooManyRequestsException`.
- The Express Workflows performance tip described the 5-minute consideration per Map iteration. Updated it to refer to workflow completion within 5 minutes, matching AWS's documented Express Workflow execution limit.
- The Distributed Map performance tip referred to an array with millions of items. Updated this to "dataset" because Distributed Map can read from S3 data sources and is not limited to a JSON array passed in the state input.

## Review Notes
- The three complete state-machine JSON examples were validated with `asl-validator` 4.0.0 using `--no-arn-check` because the Lambda ARNs are placeholders.
- The shorter JSON snippets are partial fragments, not complete state-machine definitions, so they were reviewed manually against the documented state fields.

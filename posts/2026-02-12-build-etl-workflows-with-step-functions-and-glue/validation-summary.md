# Validation Summary: How to Build ETL Workflows with Step Functions and Glue

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions
- AWS Glue jobs and crawlers
- Amazon EventBridge scheduled rules
- Amazon SNS
- AWS Lambda
- Amazon Athena
- AWS CLI
- Python / boto3

## Sources Consulted
- AWS Step Functions Developer Guide: Start an AWS Glue job with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html
- AWS Step Functions Developer Guide: Integrating services with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html
- AWS Step Functions Developer Guide: Task workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions Developer Guide: AWS SDK service integrations - https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html
- AWS Glue API Reference: StartCrawler - https://docs.aws.amazon.com/glue/latest/webapi/API_StartCrawler.html
- AWS CLI Command Reference: events put-targets - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Amazon EventBridge User Guide: Input transformation - https://docs.aws.amazon.com/eventbridge/latest/userguide/transform-input.html
- Amazon EventBridge User Guide: Creating a scheduled rule - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- boto3 Athena client documentation: start_query_execution, get_query_execution, get_query_results - https://docs.aws.amazon.com/boto3/latest/reference/services/athena.html

## Issues Found
- The post said Step Functions can wait for Glue crawlers with the `.sync` integration pattern. AWS documents `.sync` support for the optimized Glue `StartJobRun` integration, while crawler operations use the AWS SDK integration and require explicit polling. Updated the crawler section and introduction to make this distinction clear.
- The parallel workflow example had a state named `RunCrawler` but used `arn:aws:states:::glue:startJobRun.sync` to run a Glue job named `catalog-raw-data`. Renamed the state to `RunCatalogJob` so the example matches the API it actually invokes.
- The EventBridge scheduled-rule target used `<aws.scheduler.execution-id>`, which is not a valid dynamic value for legacy EventBridge rules and is not a processing date. Replaced it with an EventBridge `InputTransformer` that passes the scheduled event `$.time` value to the Step Functions input.
- The Athena helper always returned `0`, so the example would not validate row counts as described. Replaced it with polling via `get_query_execution` and result parsing via `get_query_results`.

## Review Notes
The post uses JSONPath-style Step Functions examples with `Parameters`, `ResultPath`, `Retry`, and `Catch`, which remain valid. AWS documentation now also shows JSONata examples using `Arguments`; that is a separate query language mode and does not make the JSONPath snippets invalid.

# Validation Summary: How to Stream CloudWatch Logs to OpenSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudWatch Logs
- CloudWatch Logs subscription filters
- AWS Lambda
- Amazon OpenSearch Service
- OpenSearch Bulk API
- OpenSearch index templates
- OpenSearch Index State Management
- AWS CLI
- Python

## Sources Consulted
- Amazon CloudWatch Logs: Log group-level subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Amazon CloudWatch Logs: PutSubscriptionFilter API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutSubscriptionFilter.html
- Amazon CloudWatch Logs: Subscription concepts: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/subscription-concepts.html
- AWS CLI Command Reference: opensearch create-domain: https://docs.aws.amazon.com/cli/latest/reference/opensearch/create-domain.html
- AWS CLI Command Reference: logs put-subscription-filter: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- AWS Lambda: Types of metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon OpenSearch Service: Index State Management: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html
- OpenSearch Documentation: Bulk API: https://docs.opensearch.org/latest/api-reference/document-apis/bulk/
- OpenSearch Documentation: Index templates: https://docs.opensearch.org/latest/api-reference/index-apis/index-templates/

## Issues Found
- The Lambda sample did not handle CloudWatch Logs `CONTROL_MESSAGE` payloads. Added an early return for control messages so the function does not try to index them as log events.
- The Lambda permission example used a regional CloudWatch Logs principal and omitted `--source-account`. Updated it to the documented `logs.amazonaws.com` service principal and added `--source-account` to scope invocation permission.
- The ISM section said the shown policy would "roll over" indices, but the policy only transitions index states and deletes old indices. Updated the wording to "transition and delete".
- The multiple-log-group loop created subscription filters without granting each log group permission to invoke the Lambda function. Added `aws lambda add-permission` inside the loop with a unique statement ID for each log group.
- The monitoring section recommended `Iterator age` for CloudWatch Logs subscriptions. Replaced it with the relevant CloudWatch Logs subscription delivery metrics: `DeliveryErrors` and `DeliveryThrottling`.

## Review Notes
- The OpenSearch domain access policy shown is intentionally permissive for an example. In production, it should be scoped to specific IAM principals and paired with the domain's network and fine-grained access controls.
- The Lambda deployment command assumes the deployment package includes third-party dependencies such as `opensearch-py` and `requests-aws4auth`.

# Validation Summary: How to Set Up Health-Aware Dashboards on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Health
- Amazon EventBridge
- Amazon CloudWatch dashboards and custom metrics
- AWS Lambda
- AWS CLI
- Python and boto3
- Amazon EC2 status checks
- Amazon RDS CloudWatch metrics
- Elastic Load Balancing / Application Load Balancer target health

## Sources Consulted
- AWS Health API Reference: https://docs.aws.amazon.com/health/latest/APIReference/Welcome.html
- AWS Health EventBridge schema: https://docs.aws.amazon.com/health/latest/ug/aws-health-events-eventbridge-schema.html
- AWS Health events in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-health.html
- Monitoring account-specific and public events for AWS Health: https://docs.aws.amazon.com/health/latest/ug/about-public-events.html
- AWS CLI `health describe-events`: https://docs.aws.amazon.com/cli/latest/reference/health/describe-events.html
- AWS Health endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/awshealth.html
- EventBridge resource-based policies for Lambda targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- CloudWatch dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- CloudWatch `put_metric_data` boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html
- EC2 status check metrics: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Application Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html

## Issues Found
- The prerequisites incorrectly implied broad AWS Health API availability. Updated the wording to distinguish AWS Health EventBridge events from Step 5 AWS Health API access, which requires an eligible paid support plan.
- The Lambda example read `detail.affectedRegion`, but the AWS Health EventBridge schema uses `detail.eventRegion` for the impacted Region. Updated the field lookup.
- The AWS Health event category mapping omitted `investigation`, a documented EventBridge category. Added it to the severity mapping.
- The Python Lambda example used `datetime.utcnow()`, which is deprecated in current Python versions. Updated it to `datetime.now(timezone.utc)`.
- The EventBridge-to-Lambda setup added targets but did not grant EventBridge permission to invoke the Lambda functions. Added `aws lambda add-permission` commands for both EventBridge rules.
- The resource health Lambda used single, non-paginated API calls for EC2 instance status and ALB target groups. Updated the example to use boto3 paginators so it does not silently miss resources in larger accounts.
- The CloudWatch dashboard JSON snippets contained `//` comments, which would make a `dashboard.json` file invalid for `aws cloudwatch put-dashboard`. Removed those comments.

## Review Notes
The dashboard and metric examples still use placeholder ARNs, account IDs, load balancer names, and target group names that readers must replace. The AWS CLI was not installed in the local environment, so CLI command validation was performed against official AWS CLI documentation instead of local `--help` output.

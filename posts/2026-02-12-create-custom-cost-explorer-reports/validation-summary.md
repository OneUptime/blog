# Validation Summary: How to Create Custom Cost Explorer Reports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Cost Explorer
- AWS Cost Explorer API
- Python
- boto3
- AWS Lambda
- Amazon EventBridge scheduled rules
- Terraform AWS Provider

## Sources Consulted
- AWS SDK for Python boto3 Cost Explorer `get_cost_and_usage` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html
- AWS SDK for Python boto3 Cost Explorer `get_reservation_coverage` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_coverage.html
- AWS SDK for Python boto3 Cost Explorer `get_savings_plans_utilization` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_savings_plans_utilization.html
- AWS Billing and Cost Management API Reference for `GetReservationCoverage`: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetReservationCoverage.html
- Amazon EventBridge schedule expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Terraform AWS Provider `aws_cloudwatch_event_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- AWS Cost Explorer product documentation and FAQs: https://aws.amazon.com/aws-cost-management/aws-cost-explorer/ and https://aws.amazon.com/aws-cost-management/aws-cost-explorer/faqs/

## Issues Found
- The Cost Explorer metric table described `UnblendedCost` as the actual cost paid. I changed the wording to describe it as cost at unblended rates and added `NetUnblendedCost` for after-discount cost, matching the official Cost Explorer metric names.
- The Reserved Instance coverage example used `Granularity` together with `GroupBy`. AWS documents that `Granularity` cannot be set when `GroupBy` is set for `GetReservationCoverage`, so I removed `Granularity`.
- The Reserved Instance coverage example grouped by `SERVICE`, but `GetReservationCoverage` group-by support is limited to attributes such as `INSTANCE_TYPE`, `REGION`, and `TENANCY`. I changed the example to group by `INSTANCE_TYPE` and updated the report labels.
- The anomaly report text said it "plots" daily costs, but the code prints a textual report. I changed the description to say it lists daily costs.
- The automation section referred to CloudWatch Events. The Terraform resource still works, but AWS now documents these as EventBridge scheduled rules, so I updated the wording.

## Review Notes
The Python snippets were checked for syntax after edits. The examples do not implement pagination for Cost Explorer responses; that is acceptable for a concise tutorial, but production reporting code should follow `NextPageToken` where returned.

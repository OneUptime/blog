# Validation Summary: How to Set Up Anomaly Detection for AWS Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Cost Anomaly Detection
- AWS Cost Explorer API and AWS CLI
- Amazon SNS
- AWS Lambda
- Python boto3
- AWS Budgets
- Slack incoming webhooks

## Sources Consulted
- AWS Cost Management User Guide: Detecting unusual spend with AWS Cost Anomaly Detection: https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html
- AWS Cost Management User Guide: Getting started with AWS Cost Anomaly Detection: https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html
- AWS Billing and Cost Management API Reference: CreateAnomalyMonitor: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CreateAnomalyMonitor.html
- AWS CLI Command Reference: create-anomaly-subscription: https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-subscription.html
- AWS CLI Command Reference: get-anomalies: https://docs.aws.amazon.com/cli/latest/reference/ce/get-anomalies.html
- AWS Lambda Developer Guide: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS CLI Command Reference: budgets create-budget: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html

## Issues Found
- The post listed only three Cost Anomaly Detection monitor dimensions. Updated it to include cost categories, which are supported by AWS managed monitors.
- The post said the ML model takes about two weeks to establish a baseline. Updated this to AWS's documented behavior: a new monitor can take up to 24 hours to begin detecting anomalies, and a new service subscription needs 10 days of historical service usage data before anomalies can be detected for that service.
- The account-level monitor example used `MonitorDimension: "SERVICE"`. Changed it to `MonitorDimension: "LINKED_ACCOUNT"` so it actually creates a linked-account monitor.
- The custom monitor example attempted to create a customer-managed monitor filtered by AWS services. AWS documentation states customer-managed AWS services monitors are not supported, so the example was changed to a valid customer-managed linked-account monitor.
- The Slack Lambda example read `dimensionValue`, but AWS's SNS example uses `dimensionalValue`. Updated the field name.
- The Slack Lambda example constructed a console URL from only the anomaly ID, which did not match AWS's documented anomaly details URL shape. Updated the code to use the `anomalyDetailsLink` included in the Cost Anomaly Detection SNS message.
- The post tags included CloudWatch even though the implementation uses Cost Anomaly Detection, SNS, Lambda, and Slack. Replaced the CloudWatch tag with SNS.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI and API documentation instead of local `aws --help` output.
- The Budgets example is structurally consistent with the AWS CLI documentation. In production, teams may also want to specify `ThresholdType` explicitly for readability, though the current example is not technically invalid.

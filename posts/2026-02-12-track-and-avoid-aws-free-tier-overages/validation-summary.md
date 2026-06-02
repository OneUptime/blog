# Validation Summary: How to Track and Avoid AWS Free Tier Overages

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS Free Tier
- AWS Billing and Cost Management
- AWS Budgets
- AWS Free Tier API
- AWS CLI
- Boto3 / Python
- AWS Lambda
- Amazon SNS
- Amazon EventBridge
- Amazon CloudWatch
- Amazon EC2, EBS, Elastic IP, NAT Gateway
- Amazon RDS
- Elastic Load Balancing
- Amazon S3
- CloudWatch Logs

## Sources Consulted
- AWS Billing User Guide: Tracking your AWS Free Tier usage - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html
- AWS Billing User Guide: Customizing your Billing preferences - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html
- AWS Billing and Cost Management API Reference: GetFreeTierUsage - https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_freetier_GetFreeTierUsage.html
- AWS CLI Command Reference: budgets create-budget - https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS Billing and Cost Management API Reference: Budget Notification - https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Notification.html
- AWS Cost Management User Guide: Creating an Amazon SNS topic for budget notifications - https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- AWS Cost Management User Guide: Configuring budget actions - https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
- Amazon EC2 User Guide: Track your Free Tier usage for Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html
- Amazon VPC User Guide: Public IP insights - https://docs.aws.amazon.com/vpc/latest/ipam/view-public-ip-insights.html
- Amazon RDS User Guide: AWS Free Tier on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html
- Amazon CloudWatch User Guide: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- Amazon S3 User Guide: Metrics and dimensions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- AWS CLI Command Reference: events put-targets - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html

## Issues Found
- Removed `aws ce get-preferences` from the billing-alerts section because it does not verify whether AWS Free Tier usage alerts or CloudWatch billing alerts are enabled. AWS documents those alert preferences as Billing console settings.
- Changed the AWS Budgets notification to use `ThresholdType: ABSOLUTE_VALUE` with a `$0.01` threshold. Without this, the threshold is treated as a budget percentage rather than an absolute spend amount.
- Reworded the "zero-dollar budget" claim to "near-zero budget" because the example budget limit is `$0.01`, not `$0.00`.
- Corrected the EC2 scanner language from "free tier covers 1" to monthly instance-hour limits. AWS Free Tier eligibility is based on offer limits and account creation date, not simply one running instance.
- Updated the EC2 instance type eligibility check to include current AWS-documented Free Tier eligible instance types and added a note that eligibility varies by account creation date and plan.
- Updated the Elastic IP warning because AWS now charges for all public IPv4 addresses, including Elastic IP addresses whether associated or idle.
- Removed `db.t2.micro` from the RDS Free Tier eligibility check because current AWS RDS Free Tier documentation lists `db.t3.micro` and `db.t4g.micro`.
- Changed the CloudWatch dashboard example from using EC2 `CPUUtilization` `SampleCount` as "Instance Hours" to `Average` CPU utilization, and clarified that the dashboard shows resource activity trends rather than direct Free Tier consumption.
- Clarified that triggering the kill-switch Lambda from a budget threshold requires an SNS budget alert, a Lambda subscription, and permission for AWS Budgets to publish to the SNS topic.

## Review Notes
The embedded Python examples were parsed with Python `ast` and are syntactically valid. The local environment did not have the AWS CLI or Boto3 installed, so AWS command and API behavior was verified against official AWS documentation instead of local command help.

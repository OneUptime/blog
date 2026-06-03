# Validation Summary: How to Apply the Cost Optimization Pillar on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Well-Architected Framework
- AWS Cost Optimization pillar
- AWS Budgets
- AWS Cost Explorer and Cost Anomaly Detection
- AWS cost allocation tags
- Amazon EC2 Auto Scaling groups
- Amazon EC2 Spot Instances and EC2 Fleet
- AWS Savings Plans
- Amazon RDS reserved instances
- Amazon EventBridge Scheduler
- Amazon S3 lifecycle configuration and Transfer Acceleration
- Amazon DynamoDB on-demand capacity
- Amazon ECS on AWS Fargate
- AWS VPC gateway endpoints
- Terraform AWS provider

## Sources Consulted
- AWS Well-Architected Framework, Cost Optimization design principles: https://docs.aws.amazon.com/wellarchitected/latest/framework/cost-dp.html
- AWS Savings Plans user guide: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html
- Terraform AWS provider `aws_savingsplans_savings_plan`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/savingsplans_savings_plan.html.markdown
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS CLI `request-spot-fleet` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html
- Terraform AWS provider `aws_ec2_fleet`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_fleet.html.markdown
- Terraform AWS provider `aws_autoscaling_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- Terraform AWS provider `aws_budgets_budget`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/budgets_budget.html.markdown
- Terraform AWS provider `aws_ce_cost_allocation_tag`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_cost_allocation_tag.html.markdown
- Terraform AWS provider `aws_ce_anomaly_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_subscription.html.markdown
- Terraform AWS provider `aws_scheduler_schedule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/scheduler_schedule.html.markdown
- AWS EventBridge Scheduler universal targets: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets-universal.html
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- DynamoDB on-demand pricing: https://aws.amazon.com/dynamodb/pricing/on-demand/
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- Amazon VPC gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Amazon S3 Transfer Acceleration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html

## Issues Found
1. **Unsupported broad overspending and utilization claims** - The original post stated that most organizations overspend by 30-40% and that most EC2 instances run under 20% CPU utilization. These were too specific without an authoritative source in the post, so they were softened to accurate general guidance about common overspending and low utilization.
2. **Incorrect Spot percentage explanation** - The Auto Scaling group example has one On-Demand base instance and Spot above that baseline. With `desired_capacity = 2`, it is not 90% Spot. Updated the explanation to say it reaches 90% Spot at the maximum size of 10 instances.
3. **Outdated Savings Plans Terraform statement** - The post said Savings Plans cannot be created directly with Terraform. The AWS provider now has `aws_savingsplans_savings_plan`. Replaced the comment with a caution that Terraform can create Savings Plans but active plans are financial commitments that cannot be canceled.
4. **Legacy Spot Fleet API example** - The post used `aws_spot_fleet_request`, which maps to the legacy RequestSpotFleet API that AWS says not to use for new designs. Replaced it with an `aws_ec2_fleet` example using `price-capacity-optimized`.
5. **Overstated serverless idle-cost claim** - The post said serverless services have zero cost when idle. DynamoDB still charges for storage and Fargate charges while tasks are running. Updated the wording to clarify that serverless avoids idle server capacity charges but can still incur storage, task, and feature charges.
6. **Misleading S3 Transfer Acceleration cost advice** - The post listed S3 Transfer Acceleration as a way to reduce data transfer costs. AWS documents additional charges for Transfer Acceleration, so the recommendation now says to use it only when the faster path justifies the extra charge.

## Review Notes
Terraform was not installed in this workspace, so I could not run `terraform validate`. The review was performed against current AWS documentation and Terraform AWS provider resource documentation.

# Validation Summary: How to Create a Cost Optimization Strategy for AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Cost Explorer and cost allocation tags
- AWS Config managed rules
- AWS Budgets
- AWS Compute Optimizer
- Amazon RDS and Amazon CloudWatch metrics
- Amazon EBS, AWS Lambda, Amazon ElastiCache
- AWS Savings Plans, Reserved Instances, and Amazon EC2 Spot Instances
- AWS VPC endpoints, CloudFront, and caching with Redis
- Python with boto3 and redis-py

## Sources Consulted
- AWS CLI Command Reference: update-cost-allocation-tags-status - https://awscli.amazonaws.com/v2/documentation/api/2.18.18/reference/ce/update-cost-allocation-tags-status.html
- AWS Config Developer Guide: Adding AWS Config Rules - https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_add-rules.html
- AWS CLI Command Reference: create-budget - https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS CLI Command Reference: get-ec2-instance-recommendations - https://docs.aws.amazon.com/cli/v1/reference/compute-optimizer/get-ec2-instance-recommendations.html
- AWS Savings Plans pricing - https://aws.amazon.com/savingsplans/compute-pricing/
- AWS Lambda pricing - https://aws.amazon.com/lambda/pricing/
- Amazon EC2 User Guide: Best practices for Amazon EC2 Spot - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS CLI Command Reference: request-spot-fleet - https://awscli.amazonaws.com/v2/documentation/api/2.15.10/reference/ec2/request-spot-fleet.html

## Issues Found
- The Compute Optimizer query used `recommendationOptions[0].estimatedMonthlySavings.value`, but the documented response nests this value under `recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value`. Updated the query so it returns the estimated savings correctly.
- The Spot Fleet example used the `lowestPrice` allocation strategy. AWS documentation says this can lead to high interruption rates and recommends price and capacity optimized allocation for Spot capacity. Updated the example to `priceCapacityOptimized`.
- The Lambda pricing example said 1 million 256MB/200ms invocations cost about $1.50. Current AWS Lambda pricing in US East works out to about $1.05 before free tier for x86 on-demand duration plus request charges, so the text was updated.
- The Redis caching Python example called `json.loads` and `json.dumps` without importing `json`. Added the missing import.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and AWS service documentation rather than local `--help` output. Several examples use placeholder account IDs, ARNs, AMIs, subnet IDs, email addresses, and Redis/database functions; those placeholders are appropriate for a blog post but must be replaced before execution.

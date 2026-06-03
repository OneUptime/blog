# Validation Summary: How to Use EC2 Savings Plans vs Reserved Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS EC2
- AWS Savings Plans
- Amazon EC2 Reserved Instances
- AWS Cost Explorer
- AWS CLI
- AWS Fargate
- AWS Lambda

## Sources Consulted
- AWS Savings Plans User Guide: Savings Plans types - https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- AWS Savings Plans User Guide: Understanding how Savings Plans apply to your usage - https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html
- Amazon EC2 User Guide: Types of Reserved Instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-types.html
- Amazon EC2 User Guide: Regional and zonal Reserved Instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html
- AWS CLI Command Reference: savingsplans describe-savings-plans-offering-rates - https://docs.aws.amazon.com/cli/latest/reference/savingsplans/describe-savings-plans-offering-rates.html
- AWS CLI Command Reference: savingsplans create-savings-plan - https://docs.aws.amazon.com/cli/latest/reference/savingsplans/create-savings-plan.html
- AWS CLI Command Reference: ce get-savings-plans-purchase-recommendation - https://docs.aws.amazon.com/cli/latest/reference/ce/get-savings-plans-purchase-recommendation.html
- AWS CLI Command Reference: ce get-cost-and-usage - https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS CLI Command Reference: ce get-savings-plans-utilization - https://docs.aws.amazon.com/cli/latest/reference/ce/get-savings-plans-utilization.html
- AWS CLI Command Reference: ce get-savings-plans-coverage - https://docs.aws.amazon.com/cli/latest/reference/ce/get-savings-plans-coverage.html

## Issues Found
- AWS now documents four Savings Plans types, not three. Updated the post to include Database Savings Plans and renamed SageMaker Savings Plans to SageMaker AI Savings Plans.
- The post said Standard RIs with All Upfront payment give the absolute best discount. Updated this to say they are among the deepest discounts, because EC2 Instance Savings Plans and Standard RIs are both documented as offering savings up to 72%.
- The Cost Explorer example used daily granularity while the surrounding text said it pulled hourly On-Demand spend. Updated the text to say daily compute spend, matching the command.
- The Savings Plans application explanation said AWS applies discounts to the most expensive instances first. Updated it to match AWS documentation: RIs apply first, EC2 Instance Savings Plans apply before Compute Savings Plans, and eligible usage is prioritized by highest savings percentage.
- The Savings Plans example referred to a $5/hour Compute Savings Plan even though the shown covered usage consumed only $0.456/hour at Savings Plan rates. Updated the wording so the example describes usage fully covered by Compute Savings Plan rates rather than a $5/hour commitment.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was validated against the official AWS CLI command reference rather than local `aws --help` output. The pricing example uses representative us-east-1 rates; AWS prices can change over time, so future reviews should re-check exact rate figures against the AWS pricing pages or Price List API.

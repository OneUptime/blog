# Validation Summary: How to Use Reserved Instances Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2 Reserved Instances
- AWS Cost Explorer
- AWS Budgets
- AWS Cost and Usage Reports
- Amazon CloudWatch
- AWS Price List API
- AWS CLI
- Bash

## Sources Consulted
- AWS EC2 Reserved Instances overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS EC2 Reserved Instance offering classes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-types.html
- AWS EC2 regional and zonal Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html
- AWS CLI `describe-scheduled-instance-availability`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-scheduled-instance-availability.html
- AWS CLI `purchase-reserved-instances-offering`: https://docs.aws.amazon.com/cli/latest/reference/ec2/purchase-reserved-instances-offering.html
- AWS CLI `modify-reserved-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-reserved-instances.html
- AWS CLI `get-reservation-coverage`: https://docs.aws.amazon.com/cli/latest/reference/ce/get-reservation-coverage.html
- AWS CLI `get-reservation-utilization`: https://docs.aws.amazon.com/cli/latest/reference/ce/get-reservation-utilization.html
- AWS CLI `get-reservation-purchase-recommendation`: https://docs.aws.amazon.com/cli/latest/reference/ce/get-reservation-purchase-recommendation.html
- AWS CLI `put-report-definition`: https://docs.aws.amazon.com/cli/latest/reference/cur/put-report-definition.html
- AWS CLI `get-products`: https://docs.aws.amazon.com/cli/latest/reference/pricing/get-products.html
- AWS Budgets reservation budgets: https://docs.aws.amazon.com/cost-management/latest/userguide/create-reservation-budget.html
- AWS CLI `create-budget`: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS public EC2 pricing offer file for current m5.xlarge Linux/shared/us-east-1 RI and On-Demand pricing: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json

## Issues Found
- The post described AWS as offering three Reserved Instance types. AWS currently documents Standard and Convertible as the two RI offering classes; Scheduled Instances are exposed separately through EC2 APIs. Updated the wording to distinguish the two offering classes from Scheduled Instances.
- The Scheduled Instance example used a fixed start window that is now in the past and used `c5.xlarge`, but the official CLI response model for Scheduled Instances lists C3, C4, M4, and R3 instance types. Changed the start window to a relative date within the next week and changed the instance type to `c4.large`.
- The RI payment examples had inconsistent pricing math, including No Upfront appearing cheaper than All Upfront. Updated the m5.xlarge us-east-1 Linux/shared examples using AWS's public EC2 pricing offer data.
- The Price List query omitted key filters, so it could return products for multiple operating systems or capacity statuses. Added `operatingSystem=Linux` and `capacitystatus=Used`.
- The regional RI section incorrectly said regional RIs provide a capacity reservation. AWS documentation says regional RIs do not reserve capacity; zonal RIs do. Corrected the explanation and advantage list.
- The CloudWatch alarm example used a non-existent `AWS/Billing` RI utilization metric. Replaced it with an AWS Budgets RI utilization alert, which is the documented AWS mechanism for RI utilization notifications.
- The `get-reservation-utilization` example combined `--granularity` and `--group-by`, which the AWS CLI documentation says is not allowed. Removed the grouping from the monthly utilization example.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI documentation and AWS public pricing data rather than local `aws help` output. The right-sizing CPU thresholds are reasonable heuristics, but production right-sizing should also account for memory, network, disk, burst credits, and application-specific latency or throughput constraints.

# Validation Summary: Why Did Savings Plans Coverage Drop While Utilization Stayed High?

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS Savings Plans
- AWS Cost Explorer
- Amazon EC2 Reserved Instances
- AWS Organizations consolidated billing
- AWS Billing discount sharing
- AWS Cost Categories
- AWS Billing Conductor
- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports
- Amazon EC2 Spot Instances
- AWS Fargate
- AWS Lambda

## Sources Consulted
- AWS Savings Plans: Understanding utilization metrics and calculations - https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html
- AWS Savings Plans: Using the Savings Plans utilization report - https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingPR.html
- AWS Savings Plans: Understanding coverage metrics and calculations - https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html
- AWS Savings Plans: Using the Savings Plans coverage report - https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingCR.html
- AWS Savings Plans: Understanding how Savings Plans apply to your usage - https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html
- AWS Savings Plans: Savings Plans types - https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- AWS Savings Plans: Services eligible for Savings Plans benefits - https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-services.html
- AWS Savings Plans: Understanding recommendation calculations - https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html
- AWS Savings Plans: Viewing your Savings Plans inventory - https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-inventory.html
- AWS Savings Plans: Queuing a Savings Plan purchase - https://docs.aws.amazon.com/savingsplans/latest/userguide/queued-sp-cart.html
- AWS Savings Plans: Returning a purchased Savings Plan - https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html
- AWS Billing: Customizing Savings Plans and Reserved Instances discount-sharing preferences - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html
- AWS Billing Conductor: Analyzing Savings Plans, reservation coverage, and utilization reports - https://docs.aws.amazon.com/billingconductor/latest/userguide/analyzing-abc-sp.html
- AWS Billing Conductor: What is pro forma billing data? - https://docs.aws.amazon.com/billingconductor/latest/userguide/understanding-proforma.html
- AWS Data Exports: Understanding Savings Plans in AWS CUR - https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html
- AWS Data Exports: Savings Plan columns in CUR 2.0 - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html
- Amazon EC2: Spot Instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html

## Issues Found
- The new-workload explanation implied that the newly added usage itself would remain On-Demand after the hourly commitment was exhausted. AWS applies Savings Plans according to benefit-allocation priority, not workload arrival time, so the new usage can displace different eligible usage. Changed the text to say that additional demand causes some eligible usage to remain On-Demand and that the specific usage depends on AWS's benefit-application order.
- The Savings Plan expiration explanation implied that the exact usage previously covered by the expired plan would become On-Demand. Remaining plans can be reallocated according to AWS's benefit-application order, so different previously covered usage can become On-Demand. Changed the text to avoid attributing the uncovered usage to a specific plan.
- The RI-expiration explanation said Savings Plans might be "consumed earlier," which could imply chronological consumption. Changed it to state that the additional usage exposed by the expired RI can consume more of the hourly commitment, leaving other eligible usage On-Demand.

## Review Notes
The post's examples focus on Compute Savings Plans and EC2 Instance Savings Plans. AWS also documents Savings Plans for other service categories, but this does not affect the metric behavior or troubleshooting logic described here. For accounts in standalone AWS Billing Conductor billing groups, AWS advises using billable rather than pro forma coverage and utilization reports for optimization decisions.

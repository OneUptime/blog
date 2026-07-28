# Validation Summary: What Happens When AWS Usage Exceeds Your Savings Plans Commitment?

## Status

validated

## Post Type

Technical FinOps guide

## Technologies Covered

- AWS Savings Plans
- Compute Savings Plans
- EC2 Instance Savings Plans
- Amazon EC2 Reserved Instances
- Amazon EC2, AWS Fargate, and AWS Lambda
- Amazon EC2 On-Demand Capacity Reservations
- Amazon EC2 Spot Instances
- AWS Cost Explorer
- Savings Plans Purchase Analyzer
- AWS Budgets and AWS Cost Anomaly Detection
- AWS Organizations discount sharing

## Sources Consulted

- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Using the Savings Plans utilization report](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingPR.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)
- [Creating a Savings Plans budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html)
- [Detecting unusual spend with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [Amazon ECS service quotas](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-quotas.html)
- [Understanding Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html)
- [Quotas for Auto Scaling resources and groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-quotas.html)

## Issues Found

No technical issues found.

## Review Notes

- The post correctly limits its benefit-application ordering discussion to compute commitments. AWS also offers SageMaker AI Savings Plans and Database Savings Plans, but those products are outside this post's stated eligible-compute scope.
- AWS documents that each hourly commitment can be used only within that hour, and remaining eligible usage is billed at On-Demand rates after the commitment is exhausted.
- The utilization and coverage distinction and the On-Demand-equivalent coverage formula match the current Savings Plans reports.
- Matching Savings Plans discounts can apply to On-Demand Capacity Reservations, including unused reservations, after discounts are preferentially applied to running instances; the discount does not itself reserve capacity.
- Savings Plans recommendation lookback periods remain 7, 30, or 60 days. Recommendations use historical usage, do not forecast future usage, and do not account for queued purchases.
- Savings Plans coverage and utilization metrics can take up to 48 hours to generate, so the post correctly avoids treating them as real-time operational signals.

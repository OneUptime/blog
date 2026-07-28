# Validation Summary: Are EC2, Fargate, Lambda, EMR, ECS, and EKS Covered by Compute Savings Plans?

## Status
validated

## Post Type
Technical reference and AWS cost-optimization guide

## Technologies Covered
- AWS Compute Savings Plans
- Amazon EC2, EC2 Reserved Instances, Spot Instances, Dedicated Instances, and Dedicated Hosts
- AWS Fargate, including Amazon ECS and Amazon EKS launch models
- AWS Lambda and Lambda Managed Instances
- Amazon EMR
- Amazon ECS and ECS Managed Instances
- Amazon EKS
- AWS Organizations consolidated billing and Savings Plans sharing
- AWS Cost and Usage Report (CUR) 2.0
- AWS Savings Plans API

## Sources Consulted
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Services eligible for Savings Plans benefits](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-services.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Compute and EC2 Instance Savings Plans pricing](https://aws.amazon.com/savingsplans/compute-pricing/)
- [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/)
- [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [Amazon ECS pricing](https://aws.amazon.com/ecs/pricing/)
- [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/)
- [Optimize spending for Windows on Amazon EC2](https://docs.aws.amazon.com/prescriptive-guidance/latest/optimize-costs-microsoft-workloads/savings-plans.html)
- [Amazon EC2 managed instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/amazon-ec2-managed-instances.html)
- [DescribeSavingsPlanRates API reference](https://docs.aws.amazon.com/savingsplans/latest/APIReference/API_DescribeSavingsPlanRates.html)
- [CUR 2.0 line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [Understanding Savings Plans purchase-analysis calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [AMD SEV-SNP for Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sev-snp.html)

## Issues Found
- The Fargate Spot discussion appeared in a section covering both ECS and EKS without identifying the service limitation. Fargate Spot is currently available for Amazon ECS, not Amazon EKS. The text now states that limitation and scopes the portfolio example to ECS.
- The organization-sharing statement referred vaguely to current preferences. It now follows AWS's documented rule precisely: in a consolidated billing family, Savings Plans apply to the owner account first and then to other accounts only when sharing is enabled.

## Review Notes
- The post contains no executable code, shell commands, or configuration snippets, but it is a technical reference with actionable billing-data and API guidance, so it was reviewed as a technical post rather than classified as `not-code-blog`.
- The documented Lambda allocation example does include request usage at a 0% illustrative discount; its Savings Plans rate equals its On-Demand rate in that example, so it can consume commitment without producing savings.
- The `DescribeSavingsPlanRates` operation name is current and correctly described for a specific existing Savings Plan. CUR 2.0 also documents `SavingsPlanCoveredUsage` and the corresponding `SavingsPlanNegation` line-item types.
- All external links in the post resolved to the intended official AWS documentation or pricing pages during review.
- Coverage and rates remain product- and usage-type-specific. The post appropriately advises readers to verify the current rate data and CUR line items instead of relying on service-level labels.

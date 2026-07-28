# Validation Summary: Savings Plans vs Reserved Instances: Which Discount Applies First?

## Status
validated

## Post Type
Technical reference and cost-management guide

## Technologies Covered
- Amazon Web Services (AWS)
- Amazon EC2
- Amazon EC2 Reserved Instances
- AWS Savings Plans
- Compute Savings Plans
- EC2 Instance Savings Plans
- AWS Organizations consolidated billing
- AWS Cost Explorer and Savings Plans Purchase Analyzer
- AWS Cost and Usage Reports and AWS Data Exports
- On-Demand Capacity Reservations
- AWS Fargate
- AWS Lambda

## Sources Consulted
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Understanding your recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Viewing Savings Plans recommendation details](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-details-view.html)
- [Evaluating Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/purchase-rec.html)
- [Purchasing Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Customizing your Billing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [Understanding Consolidated Bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [Understanding Savings Plans in AWS Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [Savings plan columns in AWS Data Exports](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [Regional and zonal Reserved Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html)
- [Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)

## Issues Found
No technical issues found.

## Review Notes
- The documented order is accurate: matching Amazon EC2 Reserved Instance benefits apply before Savings Plans; EC2 Instance Savings Plans apply before Compute Savings Plans; AWS then prioritizes the highest savings percentage and uses the lowest Savings Plans rate to break ties.
- The overlap examples, hourly commitment behavior, recommendation warning, Lambda request-rate observation, consolidated-billing order, sharing controls, and Capacity Reservation claims all agree with current AWS documentation.
- AWS currently documents four Savings Plans types, including Database Savings Plans and SageMaker AI Savings Plans. Their omission is appropriate because this post is specifically about overlapping Amazon EC2 Reserved Instances, EC2 Instance Savings Plans, and Compute Savings Plans.
- The post contains no executable code, CLI commands, or configuration snippets. Its text block is a conceptual sizing aid, and the post correctly states that commitment recommendations are rate-based and should be validated with AWS tooling.

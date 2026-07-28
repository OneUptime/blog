# Validation Summary: AWS Compute vs EC2 Instance Savings Plans: Which Commitment Is Safer?

## Status
validated

## Post Type
Technical guide and FinOps decision framework

## Technologies Covered
- AWS Savings Plans
- Compute Savings Plans
- EC2 Instance Savings Plans
- Amazon EC2
- Amazon ECS
- Amazon EKS
- Amazon EMR
- AWS Fargate
- AWS Lambda
- Amazon EC2 Reserved Instances
- AWS Cost Explorer and Savings Plans Purchase Analyzer

## Sources Consulted
- [AWS Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Services eligible for Savings Plans benefits](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-services.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding your recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Returning a purchased Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/return-sp.html)

## Issues Found
No technical issues found.

## Review Notes
The risk-adjusted savings equation is correctly identified as a planning model rather than an AWS billing formula. The 66% and 72% figures are correctly presented as maximum advertised discounts rather than guaranteed rates. AWS documents that commitment terms cannot be changed after purchase, although an eligible plan with an hourly commitment of $100 or less can be returned under limited conditions within seven days and within the same calendar month.

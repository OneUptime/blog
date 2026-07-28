# Validation Summary: Do AWS Savings Plans Apply to Spot Instances or On-Demand Capacity Reservations?

## Status
validated

## Post Type
Technical reference

## Technologies Covered
- AWS Savings Plans
- Amazon EC2 Spot Instances
- Amazon EC2 On-Demand Capacity Reservations
- Amazon EC2 Reserved Instances
- AWS Fargate Spot
- AWS Resource Access Manager
- AWS Cost and Usage Reports
- AWS Cost Explorer

## Sources Consulted
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)
- [Reserve compute capacity with EC2 On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html)
- [Shared Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservation-sharing.html)
- [Billing assignment for shared Amazon EC2 Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/assign-billing.html)
- [Amazon ECS pricing](https://aws.amazon.com/ecs/pricing/)
- [Monitoring your On-Demand capacity reservations](https://docs.aws.amazon.com/cur/latest/userguide/monitor-ondemand-reservations.html)
- [Monitor Capacity Reservations usage with CloudWatch metrics](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservation-cw-metrics.html)

## Issues Found
No technical issues found.

## Review Notes
The post contains no executable code, commands, or configuration snippets, so the review focused on AWS billing behavior, discount eligibility and application order, Capacity Reservation scope, shared-account billing, Cost and Usage Report usage types, and documentation links. AWS documentation confirms that Savings Plans do not cover Spot usage, that matching Savings Plans and Regional Reserved Instance discounts can cover used or eligible unused On-Demand Capacity Reservations, and that discounts are preferentially applied to running instance usage before unused reserved capacity. The post also correctly keeps capacity sharing separate from Savings Plans sharing and accounts for billing assignment of available shared capacity.

# Validation Summary: How to Use Reserved Instances and Savings Plans with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS EC2 Reserved Instances
- AWS Savings Plans
- AWS Budgets
- AWS Cost Explorer
- AWS EC2 Auto Scaling
- AWS Launch Templates
- AWS RDS Reserved DB Instances

## Sources Consulted
- AWS EC2 Reserved Instances overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- How Reserved Instance discounts are applied: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/apply_ri.html
- Monitoring size-flexible reservations: https://docs.aws.amazon.com/cur/latest/userguide/monitor-flexible-reservation.html
- Savings Plans overview: https://docs.aws.amazon.com/cost-management/latest/userguide/manage-sp.html
- Savings Plans types: https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- Creating a Savings Plans budget: https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html
- Creating a reservation budget: https://docs.aws.amazon.com/cost-management/latest/userguide/create-reservation-budget.html
- Understanding reservations in Cost Explorer: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-ris.html
- Auto Scaling allocation strategies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- EC2 Auto Scaling `InstancesDistribution` API reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html
- AWS provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS provider `aws_rds_reserved_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_reserved_instance

## Issues Found
- The opening claim said OpenTofu cannot provision RIs directly. That was too broad because the AWS provider currently documents `aws_rds_reserved_instance`. I narrowed the statement to EC2 Reserved Instances and Savings Plans, which matches the post's EC2 focus and the current provider surface.
- The tracked RI example used an expiry date in the past for what was described as an active reservation. I updated the example expiry date to a future date.
- The launch template example included an empty `instance_market_options` block. That block is for Spot market options and should not be present for standard On-Demand launches, so I removed it and clarified the RI matching comment.
- The ASG examples implied exact one-to-one RI matching and omitted the subnet setting needed for a practical Auto Scaling group example. I clarified the baseline-capacity wording, added `vpc_zone_identifier`, and made the mixed instances policy explicitly prioritize the RI-covered On-Demand type.
- The `aws_ce_cost_and_usage` data source does not exist in the current AWS provider. I replaced that snippet with an `aws_budgets_budget` example using `SAVINGS_PLANS_COVERAGE`, which matches AWS Budgets support for Savings Plans coverage alerts.
- The CloudWatch `AWS/Reservations` / `RIUtilization` alarm example was incorrect. RI expiration alerts are configured in Cost Explorer, and RI utilization alerts are handled through AWS Budgets, so I replaced that section with a valid `aws_budgets_budget` RI utilization example and corrected the expiration guidance.
- The best-practices bullets overstated several behaviors: Compute Savings Plans flexibility was incomplete, ASG `min_size` was presented as guaranteeing RI utilization, and RI expiry timing was incorrect. I updated those bullets to match current AWS documentation.
- The RDS note was underspecified. I corrected it to reflect that Reserved DB Instances must match the relevant DB instance class and engine configuration.

## Review Notes
- Savings Plans and reservation utilization or coverage metrics can take up to 48 hours to appear in AWS Budgets.
- The revised statement about lack of direct EC2 RI or Savings Plans provisioning is an inference from the current AWS provider documentation: the provider documents `aws_rds_reserved_instance`, but I did not find a documented EC2 Reserved Instance purchase resource or Savings Plans purchase resource in the current provider docs.

# Validation Summary: How to Handle Reserved Capacity Planning with Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform (HCL)
- AWS Reserved Instances (RIs)
- AWS Savings Plans
- AWS On-Demand Capacity Reservations
- AWS Budgets (RI_COVERAGE, RI_UTILIZATION budget types)
- Amazon EC2
- Amazon RDS
- Amazon SNS
- Amazon CloudWatch (referenced but removed due to broken metric)
- Terraform AWS provider (hashicorp/aws)

## Sources Consulted
- Terraform AWS Provider Registry – `aws_ec2_capacity_reservation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_capacity_reservation
- Terraform AWS Provider Registry – `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider Registry – `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider Registry – `aws_db_instances` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instances
- Terraform AWS Provider Registry – `aws_instances` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instances
- Terraform AWS Provider Registry – `aws_instance` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- AWS CloudWatch documentation – Monitoring Estimated Charges: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- AWS Budgets API Reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html

## Issues Found

**1. Non-existent CloudWatch metric in the "Monitoring Reservation Utilization" section.**
The post defined an `aws_cloudwatch_metric_alarm` resource using `metric_name = "ReservedInstanceUtilization"` in `namespace = "AWS/Billing"`. The AWS/Billing CloudWatch namespace only publishes the `EstimatedCharges` metric — there is no built-in `ReservedInstanceUtilization` metric. The alarm as written would never produce data or fire. RI utilization is properly monitored via AWS Budgets with `budget_type = "RI_UTILIZATION"` (which the post already covers correctly in the same section).

**Fix:** Removed the broken `aws_cloudwatch_metric_alarm.ri_utilization` resource and the associated `aws_sns_topic.reservation_alerts` and `aws_sns_topic_subscription.reservation_email` resources (which existed only to receive the now-removed alarm's notifications). The remaining `aws_budgets_budget` resources with `RI_UTILIZATION` and `RI_COVERAGE` types continue to provide proper utilization and coverage monitoring with their own email notifications.

## Review Notes
- The 30–72% savings range claim is consistent with AWS's publicly stated maximum savings for 3-year all-upfront Reserved Instances on specific instance families.
- All remaining Terraform resources, data sources, attribute names, and nested block structures were verified against the current Terraform AWS provider (hashicorp/aws 5.x) documentation and are correct.
- `aws_ec2_capacity_reservation` attributes (`instance_match_criteria = "targeted"`, `end_date_type = "unlimited"`) use valid values.
- `aws_budgets_budget` uses the current `cost_filter` (singular) block form with `name`/`values`, which is the supported syntax in the 5.x provider (the older `cost_filters` map form is deprecated).
- `time_period_start` uses the correct `YYYY-MM-DD_HH:MM` format.
- The cost calculations in the reservation-planner module use 730 hours/month, which is the standard AWS billing convention for monthly hours.
- The HCL `for` expressions, `distinct()`, `length()`, and `sum()` usage is syntactically valid.

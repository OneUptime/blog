# Validation Summary: How to Use Reserved Instances with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS EC2 Reserved Instances
- EC2 On-Demand Capacity Reservations
- AWS Budgets
- Amazon RDS Reserved DB Instances
- AWS Cost Explorer reservation reporting

## Sources Consulted
- AWS EC2 Reserved Instances pricing and behavior: https://aws.amazon.com/ec2/pricing/reserved-instances/
- AWS EC2 Reserved Instance discount application: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/apply_ri.html
- AWS EC2 On-Demand Capacity Reservations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html
- AWS Budgets Budget API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html
- AWS Cost Explorer reservation reports: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-ris.html
- Terraform AWS provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider `aws_ec2_capacity_reservation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_capacity_reservation
- Terraform AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Amazon RDS Reserved DB Instances: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html

## Issues Found
- The post described `aws_ec2_capacity_reservation` as a way to purchase an EC2 Reserved Instance. Updated the text and code comment to clarify that Capacity Reservations reserve AZ capacity and are not EC2 RI purchases or billing discounts.
- The RI coverage example used a CloudWatch alarm for an `AWS/EC2` `Coverage` metric. Replaced it with an AWS Budgets `RI_COVERAGE` budget, which is the supported managed mechanism for RI coverage alerts.
- The RI utilization budgets used `limit_amount = "80"`. Updated RI coverage and utilization budget limits to `100` and left the alert threshold at `80`, matching AWS Budgets behavior for RI utilization and coverage budgets.
- The EC2 RI budget examples used the Cost Explorer service name for EC2 compute. Updated the RI budget service filter to `Amazon EC2`, which AWS Budgets documents for RI budgets.
- The instance-generation example used both `for_each` and `count` on the same `aws_instance`, which Terraform does not allow. Replaced it with a flattened local map and a single `for_each`.
- The RI modification example implied a direct one-to-one `t3.large` to `t3.xlarge` RI modification. Updated the comment to say to modify or purchase enough RI coverage before changing the Terraform instance type.
- The RDS `aws_db_instance` example omitted required creation arguments. Added `allocated_storage`, `username`, and `manage_master_user_password`, plus `skip_final_snapshot` for a complete Terraform-managed example.
- The RDS RI utilization budget used `limit_amount = "80"`. Updated it to `100` with the alert threshold left at `80`.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The snippets were checked manually against official Terraform language and AWS provider documentation.

# Validation Summary: How to Configure EC2 Capacity Reservations with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS EC2 Capacity Reservations
- Terraform AWS Provider / OpenTofu AWS provider-compatible HCL
- AWS Resource Groups

## Sources Consulted
- OpenTofu CLI `init`: https://opentofu.org/docs/cli/init/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS EC2 Capacity Reservations overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html
- AWS EC2 Capacity Reservations concepts: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cr-concepts.html
- AWS EC2 launch into Capacity Reservations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-launch.html
- AWS EC2 Capacity Reservation groups: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-cr-group.html
- AWS EC2 create Capacity Reservation group: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-group.html
- AWS Resource Groups configuration types: https://docs.aws.amazon.com/ARG/latest/userguide/about-slg-types.html
- AWS EC2 Reserved Instance scope: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html
- HashiCorp AWS provider `aws_ec2_capacity_reservation`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_capacity_reservation.html.markdown
- HashiCorp AWS provider `aws_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider `aws_resourcegroups_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/resourcegroups_group.html.markdown

## Issues Found
- The introduction said Capacity Reservations differ from all Reserved Instances by guaranteeing capacity. AWS distinguishes between regional and zonal Reserved Instances, and zonal Reserved Instances also reserve capacity. I corrected this to refer specifically to Regional Reserved Instances.
- The comment on `ebs_optimized = true` was incorrect. That argument controls whether the Capacity Reservation supports EBS-optimized instances; it does not explain why unused reserved capacity remains available. I corrected the comment.
- The time-limited example used an `end_date` in the past relative to the validation date, which would make the example stale. I updated the `end_date` and matching tag value to a future date.
- The targeted reservation example in `aws_instance` was misleading because the active configuration used `capacity_reservation_preference = "open"`, not a specific target. I corrected the comment and clarified that targeted usage replaces the preference setting.
- The Capacity Reservation group example did not configure the resource group as a Capacity Reservation pool, so it would not match AWS’s documented model for a targetable Capacity Reservation group. I added the required `configuration` blocks and explicit `resource_query.type`.
- The Step 2 reservation would not have matched the Step 4 group’s tag filter because it lacked the `Environment` tag. I added that tag so the example is internally consistent.
- The conclusion said to combine Capacity Reservations with Savings Plans or Reserved Instances. AWS documentation is more precise here: Capacity Reservations can be combined with Savings Plans or Regional Reserved Instances for discounts. I corrected that wording.

## Review Notes
- The post is technically valid after the fixes above.
- The examples use specific Availability Zone names such as `us-east-1a` and `us-east-1b`. In AWS, AZ suffixes are account-mapped, so readers should substitute the AZs and subnets appropriate for their own account and Region.

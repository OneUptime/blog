# Validation Summary: How to Configure EC2 Capacity Reservations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 On-Demand Capacity Reservations
- AWS EC2 Capacity Reservation Fleets
- AWS EC2 Auto Scaling
- AWS CloudWatch metrics and alarms
- AWS Resource Access Manager
- AWS CLI
- Terraform AWS Provider

## Sources Consulted
- AWS EC2 User Guide: Reserve compute capacity with EC2 On-Demand Capacity Reservations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html
- AWS EC2 User Guide: Launch instances into an existing Capacity Reservation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-launch.html
- AWS CLI Command Reference: create-capacity-reservation: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-capacity-reservation.html
- AWS CLI Command Reference: create-capacity-reservation-fleet: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-capacity-reservation-fleet.html
- AWS CLI Command Reference: run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: create-auto-scaling-group: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Amazon EC2 Auto Scaling User Guide: Use Capacity Reservation preference with your Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/capacity-reservation-create-asg-procedure.html
- AWS EC2 User Guide: Monitor Capacity Reservations usage with CloudWatch metrics: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservation-cw-metrics.html
- AWS EC2 User Guide: Shared Capacity Reservations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservation-sharing.html
- AWS RAM User Guide: Creating a resource share in AWS RAM: https://docs.aws.amazon.com/ram/latest/userguide/working-with-sharing-create.html
- AWS Savings Plans User Guide: Compute Savings Plans and Reserved Instances: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html
- Terraform Registry: aws_ec2_capacity_reservation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_capacity_reservation.html
- Terraform Registry: aws_launch_template: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform Registry: aws_autoscaling_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
- The Capacity Reservation Fleet section incorrectly described Capacity Reservation Groups and showed a fleet spanning multiple Availability Zones. AWS documentation states that a Capacity Reservation Fleet cannot span Availability Zones, so the section was renamed to Capacity Reservation Fleets and the example was changed to use one Availability Zone.
- The fleet command omitted `--instance-match-criteria`. The AWS CLI examples and API options include this setting, so the example now includes `--instance-match-criteria open`.
- The time-limited reservation and fleet examples used end dates that are in the past as of the validation date, June 3, 2026. The dates were updated to future dates.
- The monitoring command used arithmetic inside an AWS CLI JMESPath query. AWS CLI JMESPath does not support that subtraction expression, so the command now reports returned fields directly and explains that used capacity is total minus available capacity.
- Several placeholder AWS resource IDs and account IDs were implausible or invalid length for current AWS examples. AMI, subnet, Capacity Reservation, SNS ARN, RAM resource ARN, and Organizations principal examples were updated to realistic placeholder formats.
- The Reserved Instances comparison stated that Reserved Instances do not guarantee capacity. This was corrected to note that Zonal Reserved Instances provide the capacity benefit, while Regional Reserved Instances do not.
- The comparison table stated that Capacity Reservations have no commitment and can be canceled anytime. This was narrowed to immediate-use reservations, because future-dated Capacity Reservations can include a commitment duration.
- The Reserved Instance marketplace note was narrowed to Standard Reserved Instances, because not all RI types can be sold on the Reserved Instance Marketplace.

## Review Notes
AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI command reference pages and AWS service documentation.

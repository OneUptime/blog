# Validation Summary: How to Use Spread Placement Groups for High Availability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 placement groups
- AWS EC2 spread placement groups
- AWS CLI
- Terraform AWS provider
- Amazon EC2 Auto Scaling
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- AWS EC2 User Guide: Placement groups for your Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html
- AWS EC2 User Guide: Placement strategies for your placement groups - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html
- AWS CLI Command Reference: create-placement-group - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-placement-group.html
- AWS CLI Command Reference: describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Terraform Registry: aws_placement_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/placement_group
- Terraform Registry: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The post described `host` as a generally available spread level. AWS documentation states that host-level spread placement groups are supported only on AWS Outposts. Updated the explanation to make the Outposts-only scope clear.
- The verification section queried `Placement.HostId` and said each instance should show a different `HostId`. AWS CLI documentation defines `HostId` as the Dedicated Host ID, not a rack identifier for normal EC2 rack-level spread placement groups. Updated the verification command to show the placement group name and clarified that AWS enforces rack separation without exposing rack IDs.

## Review Notes
- The AWS CLI examples use current command names and supported options.
- The rack-level spread limit of seven running instances per Availability Zone per placement group is current per AWS documentation.
- The Terraform placement group example uses supported `strategy` and `spread_level` arguments.
